import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient

from cloud.main import app
from cloud.models import (
    PlanRequest, Plan, PlanEvent, ClassSlot, PlanTopic,
    StudyPreferences, StudyBlock
)
from cloud.planner.validator import validate_plan
from cloud.planner.greedy import generate_greedy_plan

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "noted-cloud"
    assert "version" in data
    assert "X-Response-Time-Ms" in response.headers

def test_plan_empty_request():
    payload = {
        "now": "2026-10-05T09:00:00Z",
        "horizonDays": 7,
        "events": [],
        "classes": [],
        "topics": [],
        "prefs": {
            "sleepStart": "23:00",
            "sleepEnd": "07:00",
            "maxStudyMinutesPerDay": 240,
            "blockMinutes": 45,
            "bestTime": "evening",
            "breakMinutes": 15,
            "bufferHoursBeforeDeadline": 2
        }
    }
    response = client.post("/plan", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["source"] == "greedy"
    assert data["plan"]["blocks"] == []
    assert data["violations"] == []
    assert data["latencyMs"] >= 0

def test_plan_generation_and_validation():
    # Schedule study for an upcoming quiz in 3 days
    now = datetime(2026, 10, 5, 9, 0, 0)
    quiz_time = now + timedelta(days=3, hours=5) # 3 days later, 14:00
    
    # 2026-10-05 is a Monday (spec weekday 1)
    # Class on Monday 10:00 - 11:30 (startMinute=600, endMinute=690)
    req = PlanRequest(
        now=now.isoformat(),
        horizonDays=7,
        events=[
            PlanEvent(
                id=101,
                kind="quiz",
                subject="Calculus",
                title="Calculus Quiz 2",
                startAt=quiz_time.isoformat()
            )
        ],
        classes=[
            ClassSlot(
                id=1,
                weekday=1, # Monday
                startMinute=600, # 10:00
                endMinute=690,   # 11:30
                subject="Physics Lecture"
            )
        ],
        topics=[
            PlanTopic(id=1, eventId=101, text="Derivatives & Chain Rule", isDone=False),
            PlanTopic(id=2, eventId=101, text="Integration by Parts", isDone=False)
        ],
        prefs=StudyPreferences(
            sleepStart="23:00",
            sleepEnd="07:00",
            maxStudyMinutesPerDay=180,
            blockMinutes=45,
            bestTime="evening",
            breakMinutes=15,
            bufferHoursBeforeDeadline=2
        )
    )
    
    response = client.post("/plan", json=req.model_dump())
    assert response.status_code == 200
    data = response.json()
    assert data["source"] in ("tinker", "fallback", "greedy")
    blocks = data["plan"]["blocks"]
    assert len(blocks) >= 2 # at least study and revision
    assert data["violations"] == [] # 100% compliant with rules

def test_validator_detects_all_constraints():
    base_time = datetime(2026, 10, 5, 9, 0, 0)
    event_time = base_time + timedelta(days=2) # Wednesday
    
    req = PlanRequest(
        now=base_time.isoformat(),
        horizonDays=7,
        events=[
            PlanEvent(
                id=1,
                kind="exam",
                subject="Operating Systems",
                title="OS Midterm",
                startAt=event_time.isoformat()
            )
        ],
        classes=[
            ClassSlot(
                id=1,
                weekday=(base_time.weekday() + 1) % 7, # Monday
                startMinute=600, # 10:00
                endMinute=660,   # 11:00
                subject="Algorithms"
            )
        ],
        topics=[
            PlanTopic(id=1, eventId=1, text="Process Synchronization", isDone=False)
        ],
        prefs=StudyPreferences(
            sleepStart="23:00",
            sleepEnd="07:00",
            maxStudyMinutesPerDay=90,
            blockMinutes=45,
            bestTime="evening",
            breakMinutes=15,
            bufferHoursBeforeDeadline=2
        )
    )

    # 1. Test Sleep Window Violation
    sleep_block = StudyBlock(
        start=base_time.replace(hour=23, minute=30).isoformat(),
        end=(base_time.replace(hour=23, minute=30) + timedelta(minutes=45)).isoformat(),
        kind="study",
        subject="Operating Systems",
        eventId=1
    )
    v_sleep = validate_plan(req, Plan(blocks=[sleep_block]))
    assert any(v.rule == "sleep_window" for v in v_sleep)

    # 2. Test Class Conflict Violation
    conflict_block = StudyBlock(
        start=base_time.replace(hour=10, minute=15).isoformat(),
        end=(base_time.replace(hour=10, minute=15) + timedelta(minutes=45)).isoformat(),
        kind="study",
        subject="Operating Systems",
        eventId=1
    )
    v_class = validate_plan(req, Plan(blocks=[conflict_block]))
    assert any(v.rule == "class_conflict" for v in v_class)

    # 3. Test After Deadline Violation
    late_block = StudyBlock(
        start=(event_time + timedelta(hours=1)).isoformat(),
        end=(event_time + timedelta(hours=1, minutes=45)).isoformat(),
        kind="study",
        subject="Operating Systems",
        eventId=1
    )
    v_late = validate_plan(req, Plan(blocks=[late_block]))
    assert any(v.rule == "after_deadline" for v in v_late)

    # 4. Test Daily Limit Violation
    day_blocks = [
        StudyBlock(
            start=base_time.replace(hour=14, minute=0).isoformat(),
            end=base_time.replace(hour=14, minute=45).isoformat(),
            kind="study",
            subject="Operating Systems",
            eventId=1
        ),
        StudyBlock(
            start=base_time.replace(hour=15, minute=0).isoformat(),
            end=base_time.replace(hour=15, minute=45).isoformat(),
            kind="study",
            subject="Operating Systems",
            eventId=1
        ),
        StudyBlock(
            start=base_time.replace(hour=16, minute=0).isoformat(),
            end=base_time.replace(hour=16, minute=45).isoformat(),
            kind="study",
            subject="Operating Systems",
            eventId=1
        )
    ] # 3 x 45m = 135m > maxStudyMinutesPerDay (90m)
    v_daily = validate_plan(req, Plan(blocks=day_blocks))
    assert any(v.rule == "daily_limit" for v in v_daily)

    # 5. Test Break Gap Violation
    no_break_blocks = [
        StudyBlock(
            start=base_time.replace(hour=14, minute=0).isoformat(),
            end=base_time.replace(hour=14, minute=45).isoformat(),
            kind="study",
            subject="Operating Systems",
            eventId=1
        ),
        StudyBlock(
            start=base_time.replace(hour=14, minute=50).isoformat(), # only 5 min gap < 15 min break
            end=base_time.replace(hour=15, minute=35).isoformat(),
            kind="study",
            subject="Operating Systems",
            eventId=1
        )
    ]
    v_break = validate_plan(req, Plan(blocks=no_break_blocks))
    assert any(v.rule == "break_violation" for v in v_break)

    # 6. Test Uncovered Topic Violation
    v_uncovered = validate_plan(req, Plan(blocks=[]))
    assert any(v.rule == "uncovered_topic" for v in v_uncovered)

def test_shared_json_fixtures():
    import json
    from pathlib import Path
    fixture_path = Path(__file__).resolve().parent.parent / "tests" / "fixtures" / "planner_test_cases.json"
    with open(fixture_path, "r", encoding="utf-8") as f:
        test_cases = json.load(f)

    for tc in test_cases:
        req = PlanRequest(**tc["request"])
        plan = Plan(**tc["plan"])
        violations = validate_plan(req, plan)
        rule_names = [v.rule for v in violations]

        for expected_rule in tc["expectedRules"]:
            assert expected_rule in rule_names, f"Case '{tc['name']}' expected rule '{expected_rule}', got {rule_names}"
        if not tc["expectedRules"]:
            assert len(violations) == 0, f"Case '{tc['name']}' expected 0 violations, got {violations}"

def test_app_token_auth():
    payload = {
        "now": "2026-10-05T09:00:00",
        "horizonDays": 7,
        "events": [],
        "classes": [],
        "topics": [],
        "prefs": {
            "sleepStart": "23:00",
            "sleepEnd": "07:00",
            "maxStudyMinutesPerDay": 240,
            "blockMinutes": 45,
            "bestTime": "evening",
            "breakMinutes": 15,
            "bufferHoursBeforeDeadline": 2
        }
    }
    # Bad token -> 401
    bad_res = client.post("/plan", json=payload, headers={"X-Noted-App-Token": "invalid-token"})
    assert bad_res.status_code == 401
    
    # Valid token -> 200
    good_res = client.post("/plan", json=payload, headers={"X-Noted-App-Token": "noted-app-token-v1"})
    assert good_res.status_code == 200

def test_input_limits_and_horizon_routing():
    # 1. Horizon > 7 days routes straight to greedy
    payload = {
        "now": "2026-10-05T09:00:00",
        "horizonDays": 14, # > 7 days
        "events": [],
        "classes": [],
        "topics": [],
        "prefs": {
            "sleepStart": "23:00",
            "sleepEnd": "07:00",
            "maxStudyMinutesPerDay": 240,
            "blockMinutes": 45,
            "bestTime": "evening",
            "breakMinutes": 15,
            "bufferHoursBeforeDeadline": 2
        }
    }
    res = client.post("/plan", json=payload)
    assert res.status_code == 200
    assert res.json()["source"] == "greedy"

    # 2. Too many events (> 50) -> 400
    oversized = dict(payload)
    oversized["events"] = [
        {"id": i, "kind": "quiz", "title": f"Quiz {i}", "startAt": "2026-10-10T10:00:00"}
        for i in range(55)
    ]
    res_oversized = client.post("/plan", json=oversized)
    assert res_oversized.status_code == 400
