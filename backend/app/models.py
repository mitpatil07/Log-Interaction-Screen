from sqlalchemy import Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship, Mapped, mapped_column
import datetime
from typing import Optional, List
from app.database import Base

class HCP(Base):
    __tablename__ = "hcps"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, index=True, nullable=False)
    specialty: Mapped[str] = mapped_column(String, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    npi_number: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)

    interactions: Mapped[List["Interaction"]] = relationship("Interaction", back_populates="hcp", cascade="all, delete-orphan")
    followups: Mapped[List["FollowUp"]] = relationship("FollowUp", back_populates="hcp", cascade="all, delete-orphan")

class Interaction(Base):
    __tablename__ = "interactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    hcp_id: Mapped[Optional[int]] = mapped_column(ForeignKey("hcps.id", ondelete="SET NULL"), nullable=True)
    hcp_name: Mapped[Optional[str]] = mapped_column(String, nullable=True) # Text input from the form
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)      # Backwards compatibility
    interaction_type: Mapped[str] = mapped_column(String, nullable=False) # e.g. "Meeting", "Call", "Email"
    date: Mapped[str] = mapped_column(String, nullable=False)    # e.g., "11/29/2025" or "2026-07-08"
    time: Mapped[Optional[str]] = mapped_column(String, nullable=True)     # e.g., "07:36 PM"
    attendees: Mapped[Optional[str]] = mapped_column(String, nullable=True) # e.g., attendees names
    topics_discussed: Mapped[Optional[str]] = mapped_column(Text, nullable=True) # Main text box
    materials_shared: Mapped[Optional[str]] = mapped_column(String, nullable=True) # Materials shared textbox
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)    # Clinical summary compiled by AI
    sentiment: Mapped[Optional[str]] = mapped_column(String, nullable=True) # Positive, Neutral, Negative
    extracted_topics: Mapped[Optional[str]] = mapped_column(String, nullable=True) # comma-separated topics
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)

    hcp: Mapped[Optional[HCP]] = relationship("HCP", back_populates="interactions")

class FollowUp(Base):
    __tablename__ = "followups"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    hcp_id: Mapped[Optional[int]] = mapped_column(ForeignKey("hcps.id", ondelete="SET NULL"), nullable=True)
    hcp_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    followup_date: Mapped[str] = mapped_column(String, nullable=False) # e.g. "2026-07-10"
    task_description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String, default="Pending") # "Pending", "Completed"
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)

    hcp: Mapped[Optional[HCP]] = relationship("HCP", back_populates="followups")
