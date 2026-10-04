import os
import sys
import json
import time
from pathlib import Path
from dotenv import load_dotenv

# Ensure root is in path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
load_dotenv()

import tinker
from tinker import types

def run_pilot():
    api_key = os.environ.get("TINKER_API_KEY")
    if not api_key:
        print("[ERROR] TINKER_API_KEY not found in environment or .env file.")
        sys.exit(1)

    print("=================================================================")
    print("      Noted ML Experiment: Phase 12 - Step 4 Pilot Run           ")
    print("=================================================================")

    # 1. Load targets
    with open("ml/train_targets.json", "r", encoding="utf-8") as f:
        all_targets = json.load(f)

    pilot_samples = all_targets[:50]
    print(f"Loaded {len(pilot_samples)} pilot examples from ml/train_targets.json.")

    # 2. Initialize ServiceClient
    client = tinker.ServiceClient(api_key=api_key)
    base_model = "Qwen/Qwen3-8B"
    print(f"Connecting to Thinking Machines Lab for base model: {base_model}...")

    # Create LoRA training client
    # rank=16 for parameter-efficient adaptation
    print("Creating LoRA Training Client (rank=16)...")
    training_client = client.create_lora_training_client(
        base_model=base_model,
        rank=16,
        user_metadata={"project": "noted-study-planner", "experiment": "phase12-pilot"}
    )
    tokenizer = training_client.get_tokenizer()

    # 3. Measure tokens exactly
    prompt_token_counts = []
    completion_token_counts = []
    data_items = []

    for item in pilot_samples:
        p_ids = tokenizer.encode(item["prompt"])
        c_ids = tokenizer.encode(item["completion"])
        full_ids = p_ids + c_ids
        
        prompt_token_counts.append(len(p_ids))
        completion_token_counts.append(len(c_ids))

        # Full causal modeling: input is full_ids[:-1], targets are full_ids[1:]
        # weights: 0.0 for prompt tokens (no loss on prompt), 1.0 for completion tokens
        weights = [0.0] * len(p_ids[:-1]) + [1.0] * len(c_ids)
        datum = types.Datum(
            model_input=types.ModelInput.from_ints(full_ids[:-1]),
            loss_fn_inputs={
                "target_tokens": full_ids[1:],
                "weights": weights
            }
        )
        data_items.append(datum)

    avg_p = sum(prompt_token_counts) / len(prompt_token_counts)
    avg_c = sum(completion_token_counts) / len(completion_token_counts)
    total_pilot_tokens = sum(prompt_token_counts) + sum(completion_token_counts)

    print("\n--- MEASURED TOKEN METRICS (Pilot N=50) ---")
    print(f"Average prompt tokens per example:     {avg_p:.1f}")
    print(f"Average completion tokens per example: {avg_c:.1f}")
    print(f"Average total tokens per example:      {(avg_p + avg_c):.1f}")
    print(f"Total tokens in pilot batch (50):      {total_pilot_tokens:,}")

    # Cost projections
    # Qwen3-8B training rate: $0.44 per million tokens
    rate_per_m = 0.44
    pilot_cost = (total_pilot_tokens / 1_000_000.0) * rate_per_m
    full_run_tokens_1epoch = 800 * (avg_p + avg_c)
    full_run_cost_1epoch = (full_run_tokens_1epoch / 1_000_000.0) * rate_per_m
    full_run_cost_2epochs = full_run_cost_1epoch * 2

    print("\n--- COST ESTIMATES ---")
    print(f"Pilot execution cost (50 examples):    ${pilot_cost:.4f}")
    print(f"Full run projection (800 ex, 1 epoch): ${full_run_cost_1epoch:.4f} (~{int(full_run_tokens_1epoch):,} tokens)")
    print(f"Full run projection (800 ex, 2 epoch): ${full_run_cost_2epochs:.4f} (~{int(full_run_tokens_1epoch * 2):,} tokens)")

    # 4. Run small training steps
    # Batch size 10 across 5 steps = 50 examples
    batch_size = 10
    num_steps = len(data_items) // batch_size
    print(f"\nExecuting pilot training loop: {num_steps} steps (batch_size={batch_size})...")

    step_losses = []
    start_time = time.perf_counter()

    for step in range(num_steps):
        batch = data_items[step * batch_size : (step + 1) * batch_size]
        
        # Forward-backward gradient computation
        fwd_bwd_future = training_client.forward_backward(batch, "cross_entropy")
        
        # Optimizer step
        optim_future = training_client.optim_step(
            types.AdamParams(learning_rate=2e-4)
        )
        
        fwd_result = fwd_bwd_future.result()
        optim_future.result()
        loss_val = fwd_result.metrics.get("loss:sum", fwd_result.metrics.get("loss", 0.0))
        step_losses.append(float(loss_val))
        print(f"  Step {step + 1}/{num_steps} complete -> Loss (sum): {loss_val:.2f}")

    elapsed_time = time.perf_counter() - start_time
    print(f"Pilot training finished in {elapsed_time:.2f}s.")

    # 5. Sample 1 output from the pilot weights
    print("\nSaving pilot weights to test sampling output...")
    sampler = training_client.save_weights_and_get_sampling_client()

    test_prompt = pilot_samples[0]["prompt"]
    prompt_ids = tokenizer.encode(test_prompt)
    model_input = types.ModelInput.from_ints(prompt_ids)

    sp = types.SamplingParams(
        max_tokens=300,
        temperature=0.2,
        seed=42
    )

    print("Generating sample output from pilot model...")
    sample_res = sampler.sample(prompt=model_input, num_samples=1, sampling_params=sp).result()
    output_tokens = sample_res.sequences[0].tokens
    decoded_output = tokenizer.decode(output_tokens)

    # Save summary metrics to json
    report_data = {
        "pilot_examples": len(pilot_samples),
        "base_model": base_model,
        "avg_prompt_tokens": round(avg_p, 1),
        "avg_completion_tokens": round(avg_c, 1),
        "total_tokens_pilot": total_pilot_tokens,
        "pilot_cost_usd": round(pilot_cost, 4),
        "full_run_cost_usd_1epoch": round(full_run_cost_1epoch, 4),
        "full_run_cost_usd_2epochs": round(full_run_cost_2epochs, 4),
        "step_losses": step_losses,
        "elapsed_seconds": round(elapsed_time, 2),
        "sample_output_preview": decoded_output[:400]
    }

    with open("ml/pilot_report.json", "w", encoding="utf-8") as f:
        json.dump(report_data, f, indent=2)

    print("\n=================================================================")
    print("                     PILOT SAMPLE OUTPUT                         ")
    print("=================================================================")
    print(decoded_output[:600])
    print("=================================================================")
    print(f"Pilot Report saved to ml/pilot_report.json.")
    print("STOPPING per instruction to report before full run.")

if __name__ == "__main__":
    run_pilot()
