from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
import datetime
from app.database import Base

class HCP(Base):
    __tablename__ = "hcps"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    specialty = Column(String, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    npi_number = Column(String, unique=True, index=True, nullable=False)

    interactions = relationship("Interaction", back_populates="hcp", cascade="all, delete-orphan")
    followups = relationship("FollowUp", back_populates="hcp", cascade="all, delete-orphan")

class Interaction(Base):
    __tablename__ = "interactions"

    id = Column(Integer, primary_key=True, index=True)
    hcp_id = Column(Integer, ForeignKey("hcps.id", ondelete="SET NULL"), nullable=True)
    hcp_name = Column(String, nullable=True) # Text input from the form
    notes = Column(Text, nullable=True)      # Backwards compatibility
    interaction_type = Column(String, nullable=False) # e.g. "Meeting", "Call", "Email"
    date = Column(String, nullable=False)    # e.g., "11/29/2025" or "2026-07-08"
    time = Column(String, nullable=True)     # e.g., "07:36 PM"
    attendees = Column(String, nullable=True) # e.g., attendees names
    topics_discussed = Column(Text, nullable=True) # Main text box
    materials_shared = Column(String, nullable=True) # Materials shared textbox
    summary = Column(Text, nullable=True)    # Clinical summary compiled by AI
    sentiment = Column(String, nullable=True) # Positive, Neutral, Negative
    extracted_topics = Column(String, nullable=True) # comma-separated topics
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    hcp = relationship("HCP", back_populates="interactions")

class FollowUp(Base):
    __tablename__ = "followups"

    id = Column(Integer, primary_key=True, index=True)
    hcp_id = Column(Integer, ForeignKey("hcps.id", ondelete="SET NULL"), nullable=True)
    hcp_name = Column(String, nullable=True)
    followup_date = Column(String, nullable=False) # e.g. "2026-07-10"
    task_description = Column(Text, nullable=False)
    status = Column(String, default="Pending") # "Pending", "Completed"
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    hcp = relationship("HCP", back_populates="followups")
