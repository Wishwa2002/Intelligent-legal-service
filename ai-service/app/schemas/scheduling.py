"""
app/schemas/scheduling.py

Pydantic schemas for the Lawyer Appointment & Consultation Scheduling Agent API.
"""

from __future__ import annotations
from typing import Any
from pydantic import BaseModel, Field


class CreateSchedulingSessionRequest(BaseModel):
    customer_id: str = Field(default="guest", description="Client or user ID")
    client_name: str | None = Field(default=None, description="Full name of client")
    user_role: str = Field(default="Client", description="Client or Lawyer")


class CreateSchedulingSessionResponse(BaseModel):
    session_id: str
    customer_id: str
    status: str
    message: str | None = None
    phase: str | None = None
    action_options: list[str] = Field(default_factory=list)
    messages: list[dict[str, Any]] = Field(default_factory=list)


class SendSchedulingMessageRequest(BaseModel):
    message: str = Field(default="", description="User message text or selected action")
    selected_lawyer_id: str | None = Field(default=None, description="Guid of selected lawyer")
    selected_slot_id: str | None = Field(default=None, description="Guid of chosen 30-min slot")
    selected_slot_time: str | None = Field(default=None, description="Time label of slot")
    consultation_type: str | None = Field(default=None, description="Phone Consultation | Meeting with a Lawyer")


class SendSchedulingMessageResponse(BaseModel):
    session_id: str
    phase: str
    message: str
    action_options: list[str] = Field(default_factory=list)
    action_type: str | None = None
    cards: list[dict[str, Any]] = Field(default_factory=list)
    confirmed_booking: dict[str, Any] | None = None
    messages: list[dict[str, Any]] = Field(default_factory=list)
