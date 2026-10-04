import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import json
from typing import Dict, Any, List, Optional
from cloud.models import PlanRequest, Plan, StudyBlock
from cloud.planner.greedy import generate_greedy_plan
from cloud.planner.validator import validate_plan, parse_iso

def score_preference_adherence(plan: Plan, best_time: str) -> float:
    """
    Computes precise preference adherence:
    Percentage of study blocks whose start time falls inside the student's preferred study window.
    - morning: 08:00 - 12:00
    - afternoon: 13:00 - 17:00
    - evening: 18:00 - 22:00
    """
    if not plan.blocks:
        return 0.0

    window = (8, 12) if best_time == "morning" else (13, 17) if best_time == "afternoon" else (18, 22)
    in_window = 0
    study_blocks = [b for b in plan.blocks if b.kind in ("study", "revision")]
    if not study_blocks:
        return 0.0

    for b in study_blocks:
        dt = parse_iso(b.start)
        if window[0] <= dt.hour < window[1]:
            in_window += 1

    return in_window / len(study_blocks)

def best_of_n_plan(scenario: Dict[str, Any], n: int = 3) -> Optional[Plan]:
    """
    Generates candidate plans, verifies with validator, and returns
    the valid plan (0 violations) with highest preference adherence.
    """
    req = PlanRequest(**scenario)
    
    candidates: List[Plan] = []
    
    # Candidate 1: Standard greedy
    p1 = generate_greedy_plan(req)
    if len(validate_plan(req, p1)) == 0:
        candidates.append(p1)

    # Candidate 2: Permute event order (prioritize events with most topics first)
    if len(req.events) > 1:
        topic_counts = {}
        for t in req.topics:
            topic_counts[t.eventId] = topic_counts.get(t.eventId, 0) + 1
        sorted_events = sorted(req.events, key=lambda e: topic_counts.get(e.id, 0), reverse=True)
        req_perm = req.model_copy(update={"events": sorted_events})
        p2 = generate_greedy_plan(req_perm)
        if len(validate_plan(req, p2)) == 0:
            candidates.append(p2)

    if not candidates:
        return None

    # Pick candidate with highest preference adherence
    best_time = req.prefs.bestTime
    candidates.sort(key=lambda p: score_preference_adherence(p, best_time), reverse=True)
    return candidates[0]

def build_prompt(scenario: Dict[str, Any]) -> str:
    """
    Standardized prompt format used identically for:
    - Base model zero/few-shot evaluation
    - Supervised training targets
    - Fine-tuned model evaluation
    """
    events_summary = []
    for ev in scenario["events"]:
        ev_topics = [t["text"] for t in scenario["topics"] if t["eventId"] == ev["id"]]
        topics_str = f" Topics: {', '.join(ev_topics)}" if ev_topics else ""
        events_summary.append(f"- [{ev['kind'].upper()}] {ev['title']} at {ev['startAt']}.{topics_str}")

    classes_summary = []
    days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    for c in scenario["classes"]:
        day_str = days[c["weekday"]]
        s_h, s_m = divmod(c["startMinute"], 60)
        e_h, e_m = divmod(c["endMinute"], 60)
        classes_summary.append(f"- {c['subject']}: {day_str} {s_h:02d}:{s_m:02d} - {e_h:02d}:{e_m:02d}")

    prefs = scenario["prefs"]

    return (
        "You are Noted's Academic Study Planner AI. Create an optimal study schedule adhering strictly to all academic constraints.\n\n"
        f"Current Time: {scenario['now']}\n"
        f"Planning Horizon: {scenario['horizonDays']} days\n\n"
        "Upcoming Academic Events:\n" + "\n".join(events_summary) + "\n\n"
        "Weekly Class Timetable (Blocked Hours):\n" + "\n".join(classes_summary) + "\n\n"
        f"Student Preferences:\n"
        f"- Sleep Window: {prefs['sleepStart']} to {prefs['sleepEnd']}\n"
        f"- Preferred Study Time: {prefs['bestTime'].capitalize()} (morning: 08-12, afternoon: 13-17, evening: 18-22)\n"
        f"- Max Study Time Per Day: {prefs['maxStudyMinutesPerDay']} minutes\n"
        f"- Session Block Length: {prefs['blockMinutes']} minutes\n"
        f"- Minimum Break Gap: {prefs['breakMinutes']} minutes\n"
        f"- Pre-Event Buffer: {prefs['bufferHoursBeforeDeadline']} hours\n\n"
        "Rules:\n"
        "1. No overlapping study sessions.\n"
        "2. No study sessions during sleep window or class timetable.\n"
        "3. All study sessions must finish at least buffer hours before event deadline.\n"
        "4. Total daily study minutes must not exceed maximum allowed.\n"
        "5. Return ONLY a valid JSON object matching the schema: {\"blocks\": [{\"start\": \"ISO\", \"end\": \"ISO\", \"kind\": \"study\"|\"revision\", \"subject\": \"str\", \"topic\": \"str\", \"eventId\": int}]}.\n\n"
        "Study Schedule JSON:\n"
    )

def generate_training_data():
    print("Generating validated training and validation targets using Best-of-N Greedy Planner...")
    
    with open("ml/scenarios_train.json", "r", encoding="utf-8") as f:
        train_scenarios = json.load(f)
    with open("ml/scenarios_val.json", "r", encoding="utf-8") as f:
        val_scenarios = json.load(f)

    train_data = []
    val_data = []

    for s in train_scenarios:
        plan = best_of_n_plan(s)
        if plan:
            prompt = build_prompt(s)
            completion = plan.model_dump_json(indent=2)
            train_data.append({
                "scenario_id": s["id"],
                "prompt": prompt,
                "completion": completion,
                "plan": plan.model_dump()
            })

    for s in val_scenarios:
        plan = best_of_n_plan(s)
        if plan:
            prompt = build_prompt(s)
            completion = plan.model_dump_json(indent=2)
            val_data.append({
                "scenario_id": s["id"],
                "prompt": prompt,
                "completion": completion,
                "plan": plan.model_dump()
            })

    with open("ml/train_targets.json", "w", encoding="utf-8") as f:
        json.dump(train_data, f, indent=2)
    with open("ml/val_targets.json", "w", encoding="utf-8") as f:
        json.dump(val_data, f, indent=2)

    print(f"Generated {len(train_data)} / {len(train_scenarios)} valid training targets (100% 0 violations).")
    print(f"Generated {len(val_data)} / {len(val_scenarios)} valid validation targets (100% 0 violations).")

if __name__ == "__main__":
    generate_training_data()
