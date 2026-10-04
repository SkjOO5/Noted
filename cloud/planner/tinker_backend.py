import os
import time
import json
import logging
from typing import Optional, Tuple
from dotenv import load_dotenv

load_dotenv()

try:
    from ..models import PlanRequest, Plan, PlanResponse
    from .greedy import generate_greedy_plan
    from .validator import validate_plan
except (ImportError, ValueError):
    from models import PlanRequest, Plan, PlanResponse
    from planner.greedy import generate_greedy_plan
    from planner.validator import validate_plan

logger = logging.getLogger("noted.cloud.tinker")

class TinkerBackend:
    def __init__(self, model_path: Optional[str] = None):
        self.api_key = os.environ.get("TINKER_API_KEY")
        # Fine-tuned model checkpoint handle
        self.model_path = model_path or os.environ.get(
            "TINKER_MODEL_PATH",
            "tinker://e544c265-4335-5428-96e8-a6ed147df7e8:train:0/sampler_weights/noted-study-planner-lora-v1"
        )
        self.base_model = "Qwen/Qwen3-8B"
        self._sampling_client = None
        self._tokenizer = None

    def is_available(self) -> bool:
        return bool(self.api_key)

    def _get_client(self):
        if self._sampling_client is None and self.is_available():
            import tinker
            client = tinker.ServiceClient(api_key=self.api_key)
            self._sampling_client = client.create_sampling_client(
                model_path=self.model_path,
                base_model=self.base_model
            )
            self._tokenizer = self._sampling_client.get_tokenizer()
        return self._sampling_client, self._tokenizer

    def _build_prompt(self, request: PlanRequest) -> str:
        events_summary = []
        for ev in request.events:
            ev_topics = [t.text for t in request.topics if t.eventId == ev.id]
            topics_str = f" Topics: {', '.join(ev_topics)}" if ev_topics else ""
            events_summary.append(f"- [{ev.kind.upper()}] {ev.title or ev.subject} at {ev.startAt}.{topics_str}")

        classes_summary = []
        days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
        for c in request.classes:
            day_str = days[c.weekday]
            s_h, s_m = divmod(c.startMinute, 60)
            e_h, e_m = divmod(c.endMinute, 60)
            classes_summary.append(f"- {c.subject or 'Class'}: {day_str} {s_h:02d}:{s_m:02d} - {e_h:02d}:{e_m:02d}")

        prefs = request.prefs
        return (
            "You are Noted's Academic Study Planner AI. Create an optimal study schedule adhering strictly to all academic constraints.\n\n"
            f"Current Time: {request.now}\n"
            f"Planning Horizon: {request.horizonDays} days\n\n"
            "Upcoming Academic Events:\n" + ("\n".join(events_summary) if events_summary else "- None") + "\n\n"
            "Weekly Class Timetable (Blocked Hours):\n" + ("\n".join(classes_summary) if classes_summary else "- None") + "\n\n"
            f"Student Preferences:\n"
            f"- Sleep Window: {prefs.sleepStart} to {prefs.sleepEnd}\n"
            f"- Preferred Study Time: {prefs.bestTime.capitalize()} (morning: 08-12, afternoon: 13-17, evening: 18-22)\n"
            f"- Max Study Time Per Day: {prefs.maxStudyMinutesPerDay} minutes\n"
            f"- Session Block Length: {prefs.blockMinutes} minutes\n"
            f"- Minimum Break Gap: {prefs.breakMinutes} minutes\n"
            f"- Pre-Event Buffer: {prefs.bufferHoursBeforeDeadline} hours\n\n"
            "Rules:\n"
            "1. No overlapping study sessions.\n"
            "2. No study sessions during sleep window or class timetable.\n"
            "3. All study sessions must finish at least buffer hours before event deadline.\n"
            "4. Total daily study minutes must not exceed maximum allowed.\n"
            "5. Return ONLY a valid JSON object matching the schema: {\"blocks\": [{\"start\": \"ISO\", \"end\": \"ISO\", \"kind\": \"study\"|\"revision\", \"subject\": \"str\", \"topic\": \"str\", \"eventId\": int}]}.\n\n"
            "Study Schedule JSON:\n"
        )

    def _sample_once(self, sc, tok, prompt: str, seed: int, temperature: float) -> Optional[Plan]:
        from tinker import types
        input_ids = tok.encode(prompt)
        mi = types.ModelInput.from_ints(input_ids)
        sp = types.SamplingParams(
            max_tokens=550,
            temperature=temperature,
            seed=seed
        )
        fut = sc.sample(prompt=mi, num_samples=1, sampling_params=sp)
        res = fut.result()
        seq = res.sequences[0]
        decoded = tok.decode(seq.tokens)

        # Parse JSON
        start = decoded.find("{")
        end = decoded.rfind("}")
        if start != -1 and end != -1 and end > start:
            cand = decoded[start : end + 1]
            try:
                data = json.loads(cand)
                if "blocks" in data:
                    return Plan(**data)
            except Exception:
                pass
        return None

    def plan(self, request: PlanRequest) -> Tuple[Plan, str, list]:
        """
        Executes plan generation with:
        1. 7-day horizon limit check (longer horizons route straight to greedy).
        2. Sampling from fine-tuned Tinker model.
        3. Validation against all 8 rules.
        4. Single retry with different seed/temperature on validation failure.
        5. Clean fallback to greedy on failure/timeout.
        """
        # Rule: If no academic events exist, return empty greedy plan immediately
        if not request.events:
            greedy = generate_greedy_plan(request)
            return greedy, "greedy", []

        # Rule: Train and evaluate on 7-day horizons only (14 at most).
        # Cloud /plan routes longer horizons straight to greedy.
        if request.horizonDays > 7:
            logger.info(f"Horizon {request.horizonDays}d > 7d limit: routing straight to greedy.")
            greedy = generate_greedy_plan(request)
            violations = validate_plan(request, greedy)
            return greedy, "greedy", violations

        if not self.is_available():
            greedy = generate_greedy_plan(request)
            violations = validate_plan(request, greedy)
            return greedy, "greedy", violations

        try:
            sc, tok = self._get_client()
            prompt = self._build_prompt(request)

            # Sample 1: temperature 0.2, seed 42
            cand_plan = self._sample_once(sc, tok, prompt, seed=42, temperature=0.2)
            if cand_plan:
                violations = validate_plan(request, cand_plan)
                if len(violations) == 0:
                    return cand_plan, "tinker", []

            # Retry: second sample with different seed and temperature (seed 43, temp 0.4)
            logger.info("Sample 1 had violations or failed to parse. Executing second sample retry...")
            retry_plan = self._sample_once(sc, tok, prompt, seed=43, temperature=0.4)
            if retry_plan:
                violations = validate_plan(request, retry_plan)
                if len(violations) == 0:
                    return retry_plan, "tinker", []

        except Exception as e:
            logger.warning(f"Tinker backend error: {e}. Falling back to greedy.")

        # Fallback to deterministic greedy planner
        fallback_plan = generate_greedy_plan(request)
        violations = validate_plan(request, fallback_plan)
        return fallback_plan, "fallback", violations
