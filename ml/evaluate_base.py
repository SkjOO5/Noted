import os
import sys
import json
import time
from pathlib import Path
from dotenv import load_dotenv

# Ensure root in path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
load_dotenv()

import tinker
from tinker import types
from cloud.models import PlanRequest, Plan
from cloud.planner.validator import validate_plan
from cloud.planner.greedy import generate_greedy_plan
from ml.generate_targets import build_prompt, score_preference_adherence

def parse_model_json(text: str) -> dict:
    """Extract valid JSON from model completion text."""
    # Find outer curly braces
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        candidate = text[start : end + 1]
        try:
            return json.loads(candidate)
        except Exception:
            pass
    return {}

def evaluate_base_model():
    api_key = os.environ.get("TINKER_API_KEY")
    if not api_key:
        print("[ERROR] TINKER_API_KEY not found.")
        sys.exit(1)

    print("=================================================================")
    print("  Evaluating Base Model (Qwen/Qwen3-8B) on 100 Test Scenarios   ")
    print("=================================================================")

    with open("ml/scenarios_test.json", "r", encoding="utf-8") as f:
        test_scenarios = json.load(f)

    client = tinker.ServiceClient(api_key=api_key)
    base_model = "Qwen/Qwen3-8B"
    sc = client.create_sampling_client(base_model=base_model)
    tok = sc.get_tokenizer()

    valid_count = 0
    total_adherence = 0.0
    latencies = []
    total_tokens_out = 0

    sp = types.SamplingParams(
        max_tokens=400,
        temperature=0.2,
        seed=42
    )

    print(f"Running zero-shot inference on {len(test_scenarios)} held-out test scenarios...")
    
    # Run test samples
    for i, scn in enumerate(test_scenarios):
        prompt_text = build_prompt(scn)
        input_ids = tok.encode(prompt_text)
        mi = types.ModelInput.from_ints(input_ids)

        t0 = time.perf_counter()
        fut = sc.sample(prompt=mi, num_samples=1, sampling_params=sp)
        res = fut.result()
        dt = (time.perf_counter() - t0) * 1000.0
        latencies.append(dt)

        seq = res.sequences[0]
        out_tokens = seq.tokens
        total_tokens_out += len(out_tokens)
        decoded = tok.decode(out_tokens)

        parsed = parse_model_json(decoded)
        req = PlanRequest(**scn)

        if parsed and "blocks" in parsed:
            try:
                plan = Plan(**parsed)
                violations = validate_plan(req, plan)
                if len(violations) == 0:
                    valid_count += 1
                adherence = score_preference_adherence(plan, req.prefs.bestTime)
                total_adherence += adherence
            except Exception:
                pass

        if (i + 1) % 25 == 0 or i == len(test_scenarios) - 1:
            print(f"  Progress: {i + 1}/{len(test_scenarios)} | Valid so far: {valid_count}/{i + 1} ({valid_count/(i+1)*100:.1f}%)")

    n = len(test_scenarios)
    valid_rate = valid_count / n
    avg_adherence = total_adherence / n
    avg_latency = sum(latencies) / len(latencies)

    # Wilson score interval for n=100 (95% confidence)
    z = 1.96
    denominator = 1 + z**2 / n
    centre_adjusted_probability = valid_rate + z**2 / (2 * n)
    adjusted_std_dev = ( (valid_rate * (1 - valid_rate) / n) + (z**2 / (4 * n**2)) ) ** 0.5
    ci_lower = max(0.0, (centre_adjusted_probability - z * adjusted_std_dev) / denominator)
    ci_upper = min(1.0, (centre_adjusted_probability + z * adjusted_std_dev) / denominator)

    print("\n--- BASE MODEL EVALUATION RESULTS (N=100) ---")
    print(f"Valid Plan Rate:       {valid_count}/100 ({valid_rate*100:.1f}%) [95% CI: {ci_lower*100:.1f}% - {ci_upper*100:.1f}%]")
    print(f"Preference Adherence:  {avg_adherence*100:.1f}%")
    print(f"Average Latency:       {avg_latency:.1f} ms")

    results = {
        "model": base_model,
        "n_test": n,
        "valid_count": valid_count,
        "valid_rate": round(valid_rate, 4),
        "ci_lower": round(ci_lower, 4),
        "ci_upper": round(ci_upper, 4),
        "preference_adherence": round(avg_adherence, 4),
        "avg_latency_ms": round(avg_latency, 1),
        "total_tokens_out": total_tokens_out
    }

    with open("ml/base_eval_results.json", "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

if __name__ == "__main__":
    evaluate_base_model()
