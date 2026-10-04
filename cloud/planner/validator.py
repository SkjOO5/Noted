from datetime import datetime
from typing import List

try:
    from ..models import PlanRequest, Plan, PlanViolation
except (ImportError, ValueError):
    from models import PlanRequest, Plan, PlanViolation

def parse_iso(dt_str: str) -> datetime:
    # Handles both 'Z' and offset or naive
    clean = dt_str.replace('Z', '+00:00')
    return datetime.fromisoformat(clean)

def parse_hhmm(hhmm: str) -> int:
    parts = hhmm.split(':')
    return int(parts[0]) * 60 + int(parts[1])

def get_minute_of_day(dt: datetime) -> int:
    return dt.hour * 60 + dt.minute

def is_overlapping(s1: float, e1: float, s2: float, e2: float) -> bool:
    return s1 < e2 and s2 < e1

def validate_plan(request: PlanRequest, plan: Plan) -> List[PlanViolation]:
    violations: List[PlanViolation] = []
    blocks = plan.blocks
    prefs = request.prefs

    sleep_start_min = parse_hhmm(prefs.sleepStart)
    sleep_end_min = parse_hhmm(prefs.sleepEnd)
    buffer_seconds = prefs.bufferHoursBeforeDeadline * 3600

    event_map = {e.id: e for e in request.events}

    # 1. Overlap between blocks
    for i in range(len(blocks)):
        try:
            a_start = parse_iso(blocks[i].start).timestamp()
            a_end = parse_iso(blocks[i].end).timestamp()
        except Exception:
            violations.append(PlanViolation(rule="invalid_timestamp", message=f"Block {i} has invalid start/end", blockIndex=i))
            continue

        if a_end <= a_start:
            violations.append(PlanViolation(rule="block_too_short", message=f"Block {i} end is before or equal to start", blockIndex=i))
            continue

        for j in range(i + 1, len(blocks)):
            b_start = parse_iso(blocks[j].start).timestamp()
            b_end = parse_iso(blocks[j].end).timestamp()

            if is_overlapping(a_start, a_end, b_start, b_end):
                violations.append(
                    PlanViolation(
                        rule="overlap",
                        message=f"Block {i} ({blocks[i].subject or 'Study'}) overlaps with block {j} ({blocks[j].subject or 'Study'})",
                        blockIndex=i
                    )
                )

    # 2. Individual block validations
    daily_study_minutes = {}

    for i, block in enumerate(blocks):
        start_dt = parse_iso(block.start)
        end_dt = parse_iso(block.end)
        duration_minutes = (end_dt.timestamp() - start_dt.timestamp()) / 60.0

        # Rule: block_too_short
        if block.kind in ('study', 'revision'):
            if duration_minutes < prefs.blockMinutes:
                violations.append(
                    PlanViolation(
                        rule="block_too_short",
                        message=f"Block {i} duration ({duration_minutes:.0f}m) < required ({prefs.blockMinutes}m)",
                        blockIndex=i
                    )
                )

        # Rule: sleep_window
        # Check samples along the block duration
        t = start_dt.timestamp()
        end_ts = end_dt.timestamp()
        inside_sleep = False
        while t < end_ts:
            sample_dt = datetime.fromtimestamp(t, tz=start_dt.tzinfo)
            m = sample_dt.hour * 60 + sample_dt.minute
            if sleep_start_min <= sleep_end_min:
                in_s = (m >= sleep_start_min and m < sleep_end_min)
            else:
                in_s = (m >= sleep_start_min or m < sleep_end_min)
            if in_s:
                inside_sleep = True
                break
            t += 15 * 60

        if inside_sleep:
            violations.append(
                PlanViolation(
                    rule="sleep_window",
                    message=f"Block {i} overlaps sleep window ({prefs.sleepStart}-{prefs.sleepEnd})",
                    blockIndex=i
                )
            )

        # Rule: class_conflict
        # Python weekday: Monday is 0, Sunday is 6. Specification: 0=Sunday, 1=Monday..6=Saturday.
        # Convert python weekday to spec: (python_weekday + 1) % 7
        spec_weekday = (start_dt.weekday() + 1) % 7
        start_min = get_minute_of_day(start_dt)
        end_min = get_minute_of_day(end_dt)

        for cls in request.classes:
            if cls.weekday == spec_weekday:
                if is_overlapping(start_min, end_min, cls.startMinute, cls.endMinute):
                    violations.append(
                        PlanViolation(
                            rule="class_conflict",
                            message=f"Block {i} conflicts with class '{cls.subject or 'Class'}' ({cls.startMinute}m-{cls.endMinute}m)",
                            blockIndex=i
                        )
                    )

        # Rule: after_deadline
        if block.eventId and block.eventId in event_map:
            ev = event_map[block.eventId]
            ev_start_ts = parse_iso(ev.startAt).timestamp()
            if end_dt.timestamp() > ev_start_ts:
                violations.append(
                    PlanViolation(
                        rule="after_deadline",
                        message=f"Block {i} ends after start of '{ev.title or ev.subject or 'Event'}'",
                        blockIndex=i,
                        eventId=ev.id
                    )
                )
            elif end_dt.timestamp() > (ev_start_ts - buffer_seconds):
                violations.append(
                    PlanViolation(
                        rule="after_deadline",
                        message=f"Block {i} violates {prefs.bufferHoursBeforeDeadline}h buffer before '{ev.title or ev.subject or 'Event'}'",
                        blockIndex=i,
                        eventId=ev.id
                    )
                )

        # Daily accumulation
        if block.kind in ('study', 'revision'):
            date_key = start_dt.strftime('%Y-%m-%d')
            daily_study_minutes[date_key] = daily_study_minutes.get(date_key, 0) + duration_minutes

    # 3. Rule: daily_limit
    for d_key, total_m in daily_study_minutes.items():
        if total_m > prefs.maxStudyMinutesPerDay:
            violations.append(
                PlanViolation(
                    rule="daily_limit",
                    message=f"Study duration on {d_key} ({total_m:.0f}m) exceeds max allowed ({prefs.maxStudyMinutesPerDay}m)"
                )
            )

    # 4. Rule: break_violation
    study_blocks = [b for b in blocks if b.kind in ('study', 'revision')]
    study_blocks.sort(key=lambda b: parse_iso(b.start).timestamp())
    for idx in range(len(study_blocks) - 1):
        c_end = parse_iso(study_blocks[idx].end).timestamp()
        n_start = parse_iso(study_blocks[idx + 1].start).timestamp()
        gap_minutes = (n_start - c_end) / 60.0
        if 0 <= gap_minutes < prefs.breakMinutes:
            violations.append(
                PlanViolation(
                    rule="break_violation",
                    message=f"Gap between consecutive study sessions ({gap_minutes:.0f}m) is less than required break ({prefs.breakMinutes}m)"
                )
            )

    # 5. Rule: uncovered_topic
    academic_events = [e for e in request.events if e.kind in ('quiz', 'exam', 'assignment')]
    for ev in academic_events:
        pending_topics = [t for t in request.topics if t.eventId == ev.id and not t.isDone]
        if pending_topics:
            ev_ts = parse_iso(ev.startAt).timestamp()
            has_study = any(
                b.eventId == ev.id and b.kind in ('study', 'revision') and parse_iso(b.end).timestamp() <= ev_ts
                for b in blocks
            )
            if not has_study:
                violations.append(
                    PlanViolation(
                        rule="uncovered_topic",
                        message=f"Event '{ev.title or ev.subject or 'Event'}' has {len(pending_topics)} unchecked topics but no study session before deadline",
                        eventId=ev.id
                    )
                )

    return violations
