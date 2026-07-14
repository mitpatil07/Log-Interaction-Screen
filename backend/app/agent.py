import os
import datetime
from typing import Annotated, Sequence, TypedDict, Optional, List
from fastapi import FastAPI, Depends, HTTPException, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel

# LangChain / LangGraph Imports
from langchain_core.messages import BaseMessage, SystemMessage, HumanMessage, AIMessage, ToolMessage
from langchain_core.tools import tool
from langchain_groq import ChatGroq
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode, tools_condition
from langgraph.checkpoint.memory import MemorySaver

# Local Project Imports
from app.config import settings
from app.database import engine, Base, SessionLocal, get_db
from app.models import HCP, Interaction, FollowUp
from app.schemas import (
    ChatRequest, ChatResponse, ChatMessage,
    HCPCreate, HCP as HCPSchema,
    InteractionCreate, Interaction as InteractionSchema,
    FollowUpCreate, FollowUp as FollowUpSchema
)

# Ensure Database Tables Exist
Base.metadata.create_all(bind=engine)

# Initialize FastAPI App
app = FastAPI(title="AI-First CRM HCP Module Backend")

@app.on_event("startup")
def seed_database():
    db = SessionLocal()
    try:
        if db.query(HCP).count() == 0:
            seed_hcps = [
                HCP(name="Dr. Rajesh Kumar", specialty="Cardiology", email="rajesh.kumar@example.com", npi_number="1234567890"),
                HCP(name="Dr. Amit Patel", specialty="Oncology", email="amit.patel@example.com", npi_number="2345678901"),
                HCP(name="Dr. Priya Sharma", specialty="Neurology", email="priya.sharma@example.com", npi_number="3456789012")
            ]
            db.add_all(seed_hcps)
            db.commit()
            print("Database seeded with Indian HCPs successfully.")
    except Exception as e:
        print(f"Error seeding database: {e}")
    finally:
        db.close()

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize ChatGroq LLM
if not settings.GROQ_API_KEY:
    print("WARNING: GROQ_API_KEY is not set in environment. Agent queries will fail.")

def invoke_llm_with_fallback(messages, tools_list=None):
    """Invokes LLM with fallback mechanism for deprecated/decommissioned Groq models."""
    primary_model = settings.GROQ_MODEL
    models_to_try = [primary_model, "llama-3.3-70b-versatile", "llama-3.1-8b-instant", "llama3-8b-8192"]
    
    # Remove duplicates while keeping order
    seen = set()
    models_to_try = [x for x in models_to_try if not (x in seen or seen.add(x))]
    
    last_err = None
    for model_name in models_to_try:
        try:
            model = ChatGroq(
                temperature=0.1,
                groq_api_key=settings.GROQ_API_KEY,
                model=model_name
            )
            if tools_list:
                model = model.bind_tools(tools_list)
            return model.invoke(messages)
        except Exception as e:
            last_err = e
            err_msg = str(e).lower()
            # If model is deprecated/decommissioned/not found, log it and try next model
            if "decommissioned" in err_msg or "not found" in err_msg or "invalid" in err_msg or "400" in err_msg or "model_decommissioned" in err_msg:
                print(f"Model {model_name} failed. Retrying with fallback...")
                continue
            else:
                raise e
    raise last_err

# LANGGRAPH AGENT TOOL DEFINITIONS

def analyze_interaction_notes(topics_discussed: Optional[str]) -> dict:
    """Analyze discussion notes using LLM to extract summary, sentiment, and topics."""
    if not topics_discussed or not topics_discussed.strip():
        return {"summary": "", "sentiment": "Neutral", "extracted_topics": ""}
    try:
        analysis_prompt = (
            "Analyze the following healthcare professional (HCP) discussion notes. "
            "Output exactly in this format (no other text, do not prefix with anything, do not use markdown blocks):\n"
            "SUMMARY: [1-2 bullet points summarizing the discussion]\n"
            "SENTIMENT: [Positive, Neutral, or Negative]\n"
            "TOPICS: [comma-separated list of 2-4 key therapeutic or discussion topics, e.g. 'Safety', 'Dosing', 'Efficacy']\n\n"
            f"Notes: {topics_discussed}"
        )
        analysis_response = invoke_llm_with_fallback([HumanMessage(content=analysis_prompt)])
        content = analysis_response.content.strip()
        
        summary_text = ""
        sentiment_text = "Neutral"
        topics_text = ""
        
        # Parse output
        parts = content.split("SENTIMENT:")
        if len(parts) >= 2:
            summary_text = parts[0].replace("SUMMARY:", "").strip()
            rest = parts[1]
            sentiment_text = rest.split("TOPICS:")[0].strip()
            if "TOPICS:" in rest:
                topics_text = rest.split("TOPICS:")[1].strip()
        else:
            # Fallback line-by-line parsing
            for line in content.split("\n"):
                if line.startswith("SUMMARY:"):
                    summary_text = line.replace("SUMMARY:", "").strip()
                elif line.startswith("SENTIMENT:"):
                    sentiment_text = line.replace("SENTIMENT:", "").strip()
                elif line.startswith("TOPICS:"):
                    topics_text = line.replace("TOPICS:", "").strip()
        
        # Final sanitization of sentiment
        sentiment_text = sentiment_text.strip("[]* \n")
        if "positive" in sentiment_text.lower():
            sentiment_text = "Positive"
        elif "negative" in sentiment_text.lower():
            sentiment_text = "Negative"
        else:
            sentiment_text = "Neutral"
            
        if not summary_text:
            summary_text = content
            
        return {
            "summary": summary_text,
            "sentiment": sentiment_text,
            "extracted_topics": topics_text
        }
    except Exception as e:
        return {
            "summary": f"Summary generation failed: {str(e)}",
            "sentiment": "Neutral",
            "extracted_topics": ""
        }

@tool
def log_interaction(
    hcp_name: str, 
    interaction_type: str, 
    date: str, 
    time: Optional[str] = None, 
    attendees: Optional[str] = None, 
    topics_discussed: Optional[str] = None, 
    materials_shared: Optional[str] = None
) -> str:
    """Log a new interaction with a Healthcare Professional (HCP).

    Args:
        hcp_name: The name of the doctor or HCP (e.g. "Dr. Sarah Jenkins" or "Dr. Smith").
        interaction_type: Type of interaction (e.g. Meeting, Call, Email, Webinar).
        date: The date of the interaction in MM/DD/YYYY format.
        time: Optional time of the interaction (e.g. "07:36 PM").
        attendees: Optional list of attendees.
        topics_discussed: Detailed description of the topics discussed.
        materials_shared: Optional description of materials shared (e.g. "Brochures").
    """
    db = SessionLocal()
    try:
        # Check if we have a matching registered HCP
        hcp = db.query(HCP).filter(HCP.name.ilike(f"%{hcp_name}%")).first()
        hcp_id = hcp.id if hcp else None
        
        # Generate summary, sentiment and topics using helper
        analysis = analyze_interaction_notes(topics_discussed)

        # Create record
        new_interaction = Interaction(
            hcp_id=hcp_id,
            hcp_name=hcp_name,
            interaction_type=interaction_type,
            date=date,
            time=time,
            attendees=attendees,
            topics_discussed=topics_discussed,
            materials_shared=materials_shared,
            summary=analysis["summary"],
            sentiment=analysis["sentiment"],
            extracted_topics=analysis["extracted_topics"],
            notes=topics_discussed # fallback
        )
        db.add(new_interaction)
        db.commit()
        db.refresh(new_interaction)
        
        result_msg = f"Success: Logged {interaction_type} with {hcp_name} on {date}"
        if time:
            result_msg += f" at {time}"
        result_msg += f". Interaction ID: {new_interaction.id}."
        if analysis["summary"]:
            result_msg += f" Summary: {analysis['summary']}"
        return result_msg
    except Exception as e:
        db.rollback()
        return f"Error logging interaction: {str(e)}"
    finally:
        db.close()

@tool
def edit_interaction(
    interaction_id: int, 
    hcp_name: Optional[str] = None,
    interaction_type: Optional[str] = None, 
    date: Optional[str] = None,
    time: Optional[str] = None,
    attendees: Optional[str] = None,
    topics_discussed: Optional[str] = None,
    materials_shared: Optional[str] = None
) -> str:
    """Modify an existing logged interaction by ID.

    Args:
        interaction_id: The ID of the interaction to edit.
        hcp_name: Updated HCP name (optional).
        interaction_type: Updated interaction type (optional).
        date: Updated date in MM/DD/YYYY format (optional).
        time: Updated time (optional).
        attendees: Updated attendees (optional).
        topics_discussed: Updated topics discussed (optional).
        materials_shared: Updated materials shared (optional).
    """
    db = SessionLocal()
    try:
        interaction = db.query(Interaction).filter(Interaction.id == interaction_id).first()
        if not interaction:
            return f"Error: Interaction with ID {interaction_id} not found."

        updated_fields = []
        if hcp_name is not None:
            interaction.hcp_name = hcp_name
            hcp = db.query(HCP).filter(HCP.name.ilike(f"%{hcp_name}%")).first()
            if hcp:
                interaction.hcp_id = hcp.id
            updated_fields.append("hcp_name")

        if interaction_type is not None:
            interaction.interaction_type = interaction_type
            updated_fields.append("interaction_type")

        if date is not None:
            interaction.date = date
            updated_fields.append("date")

        if time is not None:
            interaction.time = time
            updated_fields.append("time")

        if attendees is not None:
            interaction.attendees = attendees
            updated_fields.append("attendees")

        if topics_discussed is not None:
            interaction.topics_discussed = topics_discussed
            interaction.notes = topics_discussed
            # Regenerate summary, sentiment, topics using the LLM helper
            analysis = analyze_interaction_notes(topics_discussed)
            interaction.summary = analysis["summary"]
            interaction.sentiment = analysis["sentiment"]
            interaction.extracted_topics = analysis["extracted_topics"]
            updated_fields.extend(["summary", "sentiment", "extracted_topics", "topics_discussed"])

        if materials_shared is not None:
            interaction.materials_shared = materials_shared
            updated_fields.append("materials_shared")

        if not updated_fields:
            return f"No updates provided for Interaction ID {interaction_id}."

        db.commit()
        return f"Success: Updated interaction {interaction_id} fields: {', '.join(updated_fields)}."
    except Exception as e:
        db.rollback()
        return f"Error updating interaction: {str(e)}"
    finally:
        db.close()

@tool
def search_hcp_history(hcp_name: str, query: Optional[str] = "") -> str:
    """Search history of all previous interactions with a specific HCP by name.

    Args:
        hcp_name: The name of the HCP (e.g. "Dr. Smith").
        query: Optional search keyword to filter notes/topics/materials.
    """
    db = SessionLocal()
    try:
        # Fetch interactions matching name
        db_query = db.query(Interaction).filter(Interaction.hcp_name.ilike(f"%{hcp_name}%"))
        if query:
            db_query = db_query.filter(
                Interaction.topics_discussed.ilike(f"%{query}%") | 
                Interaction.materials_shared.ilike(f"%{query}%") |
                Interaction.summary.ilike(f"%{query}%")
            )
        
        interactions = db_query.order_by(Interaction.date.desc()).all()
        if not interactions:
            return f"No interactions found for HCP '{hcp_name}' matching query '{query}'."

        result_str = f"Found {len(interactions)} interactions for HCP '{hcp_name}':\n"
        for idx, inter in enumerate(interactions, 1):
            result_str += (f"{idx}. [{inter.date} {inter.time or ''}] Type: {inter.interaction_type} | ID: {inter.id}\n"
                           f"   Attendees: {inter.attendees or 'None'}\n"
                           f"   Topics: {inter.topics_discussed or 'None'}\n"
                           f"   Materials Shared: {inter.materials_shared or 'None'}\n"
                           f"   Summary: {inter.summary or 'No summary'}\n\n")
        return result_str
    except Exception as e:
        return f"Error searching history: {str(e)}"
    finally:
        db.close()

@tool
def summarize_interaction(notes: str) -> str:
    """Generate a clean, professional clinical/business summary of interaction notes.

    Args:
        notes: Raw notes of the interaction or topics discussed.
    """
    try:
        prompt = (
            "You are an expert medical science liaison assistant. Summarize the following "
            "raw discussion notes between a pharmaceutical rep and an HCP into a professional, "
            "clinical/business bulleted summary suitable for a CRM system. Be objective and concise:\n\n"
            f"{notes}"
        )
        response = invoke_llm_with_fallback([HumanMessage(content=prompt)])
        return response.content.strip()
    except Exception as e:
        return f"Error generating summary: {str(e)}"

@tool
def schedule_followup(hcp_name: str, followup_date: str, task_description: str) -> str:
    """Schedule a future follow-up task or activity with an HCP.

    Args:
        hcp_name: The name of the HCP (e.g. "Dr. Smith").
        followup_date: Scheduled date for the task in MM/DD/YYYY or YYYY-MM-DD format.
        task_description: Detailed description of what needs to be done.
    """
    db = SessionLocal()
    try:
        hcp = db.query(HCP).filter(HCP.name.ilike(f"%{hcp_name}%")).first()
        hcp_id = hcp.id if hcp else None

        new_followup = FollowUp(
            hcp_id=hcp_id,
            hcp_name=hcp_name,
            followup_date=followup_date,
            task_description=task_description,
            status="Pending"
        )
        db.add(new_followup)
        db.commit()
        db.refresh(new_followup)
        return (f"Success: Scheduled follow-up task for {hcp_name} on {followup_date}. "
                f"Task ID: {new_followup.id}. Description: '{task_description}'")
    except Exception as e:
        db.rollback()
        return f"Error scheduling follow-up: {str(e)}"
    finally:
        db.close()


tools = [log_interaction, edit_interaction, search_hcp_history, summarize_interaction, schedule_followup]

#LANGGRAPH STATE GRAPH DEFINITION

class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], add_messages]
    hcp_id: Optional[int]
    current_form_state: Optional[dict]

# Core Chatbot Node
def call_model(state: AgentState):
    messages = state["messages"]
    
    # Context details from UI Form
    form_context = ""
    if state.get("current_form_state"):
        form_context = f"\n- Current UI Structured Form state context: {state['current_form_state']}"
        
    system_instruction = (
        "You are an AI Architect and Senior Medical Science Liaison assistant inside an AI-First CRM.\n"
        "Your task is to assist reps in managing interaction details with Healthcare Professionals (HCPs).\n"
        "You have access to tools: log_interaction, edit_interaction, search_hcp_history, summarize_interaction, and schedule_followup.\n"
        "Guidelines:\n"
        "1. If the user mentions logging, editing, summarizing, searching or followups, use the exact tool.\n"
        "2. Date formats should be in MM/DD/YYYY where applicable, but accept YYYY-MM-DD or relative terms.\n"
        "3. Today's date is " + datetime.date.today().isoformat() + ".\n"
        "4. Form fields mapping: hcp_name corresponds to 'HCP Name', topics_discussed to 'Topics Discussed', materials_shared to 'Materials Shared', date to 'Date', time to 'Time', attendees to 'Attendees'.\n"
        f"{form_context}\n\n"
        "Always call the tools before replying if action is requested. Return clear user confirmation."
    )
    
    # Prepend system instruction
    full_messages = [SystemMessage(content=system_instruction)] + list(messages)
    
    response = invoke_llm_with_fallback(full_messages, tools_list=tools)
    return {"messages": [response]}

# Initialize graph
workflow = StateGraph(AgentState)

# Add Nodes
workflow.add_node("agent", call_model)
workflow.add_node("tools", ToolNode(tools))

# Build graph execution paths
workflow.add_edge(START, "agent")
workflow.add_conditional_edges(
    "agent",
    tools_condition,
)
workflow.add_edge("tools", "agent")

# Compile graph with Memory Saver
memory = MemorySaver()
graph = workflow.compile(checkpointer=memory)

# ==========================================
# 3. FASTAPI ENDPOINTS & API ROUTERS
# ==========================================

@app.post("/api/chat", response_model=ChatResponse)
def chat_agent(request: ChatRequest):
    try:
        config = {"configurable": {"thread_id": request.session_id}}
        
        # Build initial state inputs
        state_input = {
            "messages": [HumanMessage(content=request.message)],
            "hcp_id": request.hcp_id,
            "current_form_state": request.current_form_state
        }
        
        # Execute the agent graph
        output = graph.invoke(state_input, config)
        
        # Format message history
        formatted_messages = []
        for msg in output["messages"]:
            role = "user"
            if isinstance(msg, AIMessage):
                role = "assistant"
            elif isinstance(msg, SystemMessage):
                role = "system"
            elif isinstance(msg, ToolMessage):
                role = "tool"
                
            formatted_messages.append(ChatMessage(
                role=role,
                content=msg.content,
                tool_calls=getattr(msg, "tool_calls", None)
            ))
            
        # Get final response text
        response_text = ""
        for msg in reversed(output["messages"]):
            if isinstance(msg, AIMessage) and msg.content:
                response_text = msg.content
                break
                
        if not response_text:
            response_text = "Tool executions completed successfully."

        # Extract Form Sync changes based on tool arguments
        form_sync = {}
        for msg in reversed(output["messages"]):
            if isinstance(msg, AIMessage) and hasattr(msg, "tool_calls") and msg.tool_calls:
                for tool_call in msg.tool_calls:
                    name = tool_call["name"]
                    args = tool_call["args"]
                    if name == "log_interaction":
                        form_sync["hcpName"] = args.get("hcp_name", "")
                        form_sync["interactionType"] = args.get("interaction_type", "Meeting")
                        form_sync["date"] = args.get("date", "")
                        form_sync["time"] = args.get("time", "")
                        form_sync["attendees"] = args.get("attendees", "")
                        form_sync["topicsDiscussed"] = args.get("topics_discussed", "")
                        form_sync["materialsShared"] = args.get("materials_shared", "")
                        # Load latest generated AI outputs to sync form
                        try:
                            db_session = SessionLocal()
                            latest = db_session.query(Interaction).order_by(Interaction.id.desc()).first()
                            if latest:
                                form_sync["summary"] = latest.summary
                                form_sync["sentiment"] = latest.sentiment
                                form_sync["extractedTopics"] = latest.extracted_topics
                            db_session.close()
                        except Exception:
                            pass
                    elif name == "schedule_followup":
                        form_sync["followupDate"] = args.get("followup_date", "")
                        form_sync["followupTask"] = args.get("task_description", "")
                    elif name == "edit_interaction":
                        inter_id = args.get("interaction_id")
                        if inter_id:
                            try:
                                db_session = SessionLocal()
                                latest = db_session.query(Interaction).filter(Interaction.id == inter_id).first()
                                if latest:
                                    form_sync["hcpName"] = latest.hcp_name
                                    form_sync["interactionType"] = latest.interaction_type
                                    form_sync["date"] = latest.date
                                    form_sync["time"] = latest.time
                                    form_sync["attendees"] = latest.attendees
                                    form_sync["topicsDiscussed"] = latest.topics_discussed
                                    form_sync["materialsShared"] = latest.materials_shared
                                    form_sync["summary"] = latest.summary
                                    form_sync["sentiment"] = latest.sentiment
                                    form_sync["extractedTopics"] = latest.extracted_topics
                                db_session.close()
                            except Exception:
                                pass

        # Parse tool message outputs for summary sync
        for msg in output["messages"]:
            if isinstance(msg, ToolMessage) and msg.name == "summarize_interaction":
                form_sync["summary"] = msg.content

        return ChatResponse(
            response=response_text,
            messages=formatted_messages,
            form_sync=form_sync if form_sync else None
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent Error: {str(e)}")

# Standard DB CRUD Endpoints

# 1. HCP Routes
@app.get("/api/hcps", response_model=List[HCPSchema])
def get_hcps(db: Session = Depends(get_db)):
    return db.query(HCP).all()

@app.post("/api/hcps", response_model=HCPSchema)
def create_hcp(hcp: HCPCreate, db: Session = Depends(get_db)):
    db_hcp = db.query(HCP).filter(HCP.email == hcp.email).first()
    if db_hcp:
        raise HTTPException(status_code=400, detail="HCP email already exists")
    db_hcp = HCP(**hcp.model_dump())
    db.add(db_hcp)
    db.commit()
    db.refresh(db_hcp)
    return db_hcp

# 2. Interaction Routes
@app.get("/api/interactions", response_model=List[InteractionSchema])
def get_interactions(db: Session = Depends(get_db)):
    return db.query(Interaction).order_by(Interaction.date.desc()).all()

@app.post("/api/interactions", response_model=InteractionSchema)
def create_interaction(interaction: InteractionCreate, db: Session = Depends(get_db)):
    # Run AI analysis on the discussion notes before logging to database
    analysis = analyze_interaction_notes(interaction.topics_discussed)
    db_interaction = Interaction(
        **interaction.model_dump(exclude={"summary", "sentiment", "extracted_topics"}),
        summary=analysis["summary"],
        sentiment=analysis["sentiment"],
        extracted_topics=analysis["extracted_topics"]
    )
    db.add(db_interaction)
    db.commit()
    db.refresh(db_interaction)
    return db_interaction

@app.put("/api/interactions/{interaction_id}", response_model=InteractionSchema)
def update_interaction(interaction_id: int, updated: dict, db: Session = Depends(get_db)):
    db_interaction = db.query(Interaction).filter(Interaction.id == interaction_id).first()
    if not db_interaction:
        raise HTTPException(status_code=404, detail="Interaction not found")
    
    # If topics_discussed is updated, regenerate summary, sentiment and topics
    if "topics_discussed" in updated:
        analysis = analyze_interaction_notes(updated["topics_discussed"])
        updated["summary"] = analysis["summary"]
        updated["sentiment"] = analysis["sentiment"]
        updated["extracted_topics"] = analysis["extracted_topics"]

    for key, val in updated.items():
        if hasattr(db_interaction, key) and val is not None:
            setattr(db_interaction, key, val)
            
    db.commit()
    db.refresh(db_interaction)
    return db_interaction

# 3. Followup Routes
@app.get("/api/followups", response_model=List[FollowUpSchema])
def get_followups(db: Session = Depends(get_db)):
    return db.query(FollowUp).order_by(FollowUp.followup_date.asc()).all()

@app.post("/api/followups", response_model=FollowUpSchema)
def create_followup(followup: FollowUpCreate, db: Session = Depends(get_db)):
    db_followup = FollowUp(**followup.model_dump())
    db.add(db_followup)
    db.commit()
    db.refresh(db_followup)
    return db_followup
