from datetime import datetime, timedelta
from typing import List, Optional

try:
    from ..models import PlanRequest, Plan, StudyBlock
    from .validator import parse_iso, parse_hhmm, get_minute_of_day, is_overlapping
except (ImportError, ValueError):
    from models import PlanRequest, Plan, StudyBlock
    from planner.validator import parse_iso, parse_hhmm, get_minute_of_day, is_overlapping

def generate_greedy_plan(request: PlanRequest) -> Plan:
    now_dt = parse_iso(request.now)
    horizon_end = now_dt + timedelta(days=request.horizonDays)
    prefs = request.prefs

    block_delta = timedelta(minutes=prefs.blockMinutes)
    break_seconds = prefs.breakMinutes * 60
    buffer_seconds = prefs.bufferHoursBeforeDeadline * 3600

    sleep_start_min = parse_hhmm(prefs.sleepStart)
    sleep_end_min = parse_hhmm(prefs.sleepEnd)

    # Relevant upcoming events
    academic_events = []
    for ev in request.events:
        if ev.kind in ('quiz', 'exam', 'assignment'):
            dt = parse_iso(ev.startAt)
            if now_dt < dt <= horizon_end:
                academic_events.append((dt, ev))

    academic_events.sort(key=lambda x: x[0].timestamp())

    placed_blocks: List[StudyBlock] = []
    daily_study_minutes = {}

    def get_preferred_hours(best_time: str):
        if best_time == 'morning':
            return (8, 12)
        elif best_time == 'afternoon':
            return (13, 17)
        else: # evening
            return (18, 22)

    def is_slot_valid(start_dt: datetime, end_dt: datetime, deadline_dt: datetime) -> bool:
        s_ts = start_dt.timestamp()
        e_ts = end_dt.timestamp()

        if s_ts < now_dt.timestamp():
            return False
        if e_ts > (deadline_dt.timestamp() - buffer_seconds):
            return False

        # Sleep check
        s_min = get_minute_of_day(start_dt)
        e_min = get_minute_of_day(end_dt)
        if sleep_start_min <= sleep_end_min:
            if s_min < sleep_end_min and e_min > sleep_start_min:
                return False
        else:
            if s_min >= sleep_start_min or s_min < sleep_end_min:
                return False
            if e_min > sleep_start_min or (0 < e_min <= sleep_end_min):
                return False

        # Class check
        spec_weekday = (start_dt.weekday() + 1) % 7
        for cls in request.classes:
            if cls.weekday == spec_weekday:
                if is_overlapping(s_min, e_min, cls.startMinute, cls.endMinute):
                    return False

        # Existing blocks check (overlap + break gap)
        for b in placed_blocks:
            b_s = parse_iso(b.start).timestamp()
            b_e = parse_iso(b.end).timestamp()

            if is_overlapping(s_ts, e_ts, b_s, b_e):
                return False

            # Break requirement if adjacent
            if s_ts >= b_e and (s_ts - b_e) < break_seconds:
                return False
            if b_s >= e_ts and (b_s - e_ts) < break_seconds:
                return False

        # Daily study limit check
        d_key = start_dt.strftime('%Y-%m-%d')
        cur_daily = daily_study_minutes.get(d_key, 0)
        if cur_daily + prefs.blockMinutes > prefs.maxStudyMinutesPerDay:
            return False

        return True

    def find_slot(target_day: datetime, deadline_dt: datetime) -> Optional[datetime]:
        candidate_days = [target_day]
        for offset in range(1, 6):
            earlier = target_day - timedelta(days=offset)
            if earlier.date() >= now_dt.date():
                candidate_days.append(earlier)
            later = target_day + timedelta(days=offset)
            if later.date() <= deadline_dt.date():
                candidate_days.append(later)

        best_start_h, best_end_h = get_preferred_hours(prefs.bestTime)

        for day in candidate_days:
            # 1. Preferred hours
            for h in range(best_start_h, best_end_h):
                for m in (0, 30):
                    cand_start = day.replace(hour=h, minute=m, second=0, microsecond=0)
                    cand_end = cand_start + block_delta
                    if is_slot_valid(cand_start, cand_end, deadline_dt):
                        return cand_start

            # 2. Other daylight hours (8 AM - 10 PM)
            for h in range(8, 22):
                if best_start_h <= h < best_end_h:
                    continue
                for m in (0, 30):
                    cand_start = day.replace(hour=h, minute=m, second=0, microsecond=0)
                    cand_end = cand_start + block_delta
                    if is_slot_valid(cand_start, cand_end, deadline_dt):
                        return cand_start

        return None

    # Schedule blocks for each event
    for event_dt, ev in academic_events:
        pending_topics = [t for t in request.topics if t.eventId == ev.id and not t.isDone]
        sessions = []
        if pending_topics:
            for t in pending_topics:
                sessions.append(('study', t.text))
            sessions.append(('revision', 'Comprehensive topic review'))
        else:
            sessions.append(('study', f"{ev.subject or 'Course'} focused study"))
            sessions.append(('revision', 'Practice test & revision'))

        total_sessions = len(sessions)
        for i, (kind, topic_label) in enumerate(sessions):
            days_before = 1 if kind == 'revision' else max(1, total_sessions - i + 1)
            target_day = event_dt - timedelta(days=days_before)
            slot = find_slot(target_day, event_dt)
            if slot:
                slot_end = slot + block_delta
                block = StudyBlock(
                    start=slot.isoformat(),
                    end=slot_end.isoformat(),
                    kind=kind,
                    subject=ev.subject or ev.title,
                    topic=topic_label,
                    eventId=ev.id
                )
                placed_blocks.append(block)
                d_key = slot.strftime('%Y-%m-%d')
                daily_study_minutes[d_key] = daily_study_minutes.get(d_key, 0) + prefs.blockMinutes

    placed_blocks.sort(key=lambda b: parse_iso(b.start).timestamp())
    return Plan(blocks=placed_blocks)
