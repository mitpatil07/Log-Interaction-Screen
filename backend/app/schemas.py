from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# HCP Schemas
class HCPBase(BaseModel):
    name: str
    specialty: str
    email: EmailStr
    npi_number: str

class HCPCreate(HCPBase):
    pass

class HCP(HCPBase):
    id: int

    class Config:
        from_attributes = True

# Interaction Schemas
class InteractionBase(BaseModel):
    hcp_id: Optional[int] = None
    hcp_name: Optional[str] = None
    notes: Optional[str] = None
    interaction_type: str
    date: str
    time: Optional[str] = None
    attendees: Optional[str] = None
    topics_discussed: Optional[str] = None
    materials_shared: Optional[str] = None
    summary: Optional[str] = None
    sentiment: Optional[str] = None
    extracted_topics: Optional[str] = None

class InteractionCreate(InteractionBase):
    pass

class InteractionUpdate(BaseModel):
    hcp_name: Optional[str] = None
    notes: Optional[str] = None
    interaction_type: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    attendees: Optional[str] = None
    topics_discussed: Optional[str] = None
    materials_shared: Optional[str] = None
    summary: Optional[str] = None
    sentiment: Optional[str] = None
    extracted_topics: Optional[str] = None

class Interaction(InteractionBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# FollowUp Schemas
class FollowUpBase(BaseModel):
    hcp_id: Optional[int] = None
    hcp_name: Optional[str] = None
    followup_date: str
    task_description: str
    status: str = "Pending"

class FollowUpCreate(FollowUpBase):
    pass

class FollowUp(FollowUpBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Conversational API Schemas
class ChatMessage(BaseModel):
    role: str # "user" or "assistant" or "system" or "tool"
    content: str
    tool_calls: Optional[List[dict]] = None

class ChatRequest(BaseModel):
    message: str
    session_id: str
    hcp_id: Optional[int] = None
    current_form_state: Optional[dict] = None

class ChatResponse(BaseModel):
    response: str
    messages: List[ChatMessage]
    form_sync: Optional[dict] = None
