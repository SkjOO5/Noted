from typing import List, Optional, Literal
from pydantic import BaseModel, Field

EventKind = Literal['quiz', 'assignment', 'exam', 'class-change', 'study', 'other']
BlockKind = Literal['study', 'revision', 'break', 'buffer']
BestTime = Literal['morning', 'afternoon', 'evening']
PlannerSource = Literal['greedy', 'tinker', 'fallback']

class PlanEvent(BaseModel):
    id: int
    kind: EventKind
    subject: Optional[str] = None
    title: Optional[str] = None
    startAt: str # ISO-8601
    endAt: Optional[str] = None

class ClassSlot(BaseModel):
    id: Optional[int] = None
    weekday: int = Field(..., ge=0, le=6) # 0=Sunday..6=Saturday
    startMinute: int = Field(..., ge=0, le=1439)
    endMinute: int = Field(..., ge=0, le=1439)
    subject: Optional[str] = None

class PlanTopic(BaseModel):
    id: Optional[int] = None
    eventId: int
    text: str
    isDone: bool = False

class StudyPreferences(BaseModel):
    sleepStart: str = '23:00'
    sleepEnd: str = '07:00'
    maxStudyMinutesPerDay: int = Field(default=240, ge=30, le=720)
    blockMinutes: int = Field(default=45, ge=15, le=180)
    bestTime: BestTime = 'evening'
    breakMinutes: int = Field(default=15, ge=5, le=60)
    bufferHoursBeforeDeadline: int = Field(default=2, ge=0, le=24)

class PlanRequest(BaseModel):
    now: str # ISO-8601
    horizonDays: int = Field(default=7, ge=1, le=30)
    events: List[PlanEvent] = Field(default_factory=list)
    classes: List[ClassSlot] = Field(default_factory=list)
    topics: List[PlanTopic] = Field(default_factory=list)
    prefs: StudyPreferences = Field(default_factory=StudyPreferences)

class StudyBlock(BaseModel):
    start: str # ISO-8601
    end: str   # ISO-8601
    kind: BlockKind
    subject: Optional[str] = None
    topic: Optional[str] = None
    eventId: Optional[int] = None

class Plan(BaseModel):
    blocks: List[StudyBlock] = Field(default_factory=list)

class PlanViolation(BaseModel):
    rule: str
    message: str
    blockIndex: Optional[int] = None
    eventId: Optional[int] = None

class PlanResponse(BaseModel):
    plan: Plan
    source: PlannerSource
    violations: List[PlanViolation]
    latencyMs: float

class HealthResponse(BaseModel):
    status: str
    version: str
    service: str
