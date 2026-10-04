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

def run_full_training():
    api_key = os.environ.get("TINKER_API_KEY")
    if not api_key:
        print("[ERROR] TINKER_API_KEY not found in environment or .env file.")
        sys.exit(1)

    print("=================================================================")
    print("      Noted ML Experiment: Phase 12 - Full LoRA Fine-Tuning      ")
    print("=================================================================")

    # 1. Load targets
    with open("ml/train_targets.json", "r", encoding="utf-8") as f:
        train_targets = json.load(f)
    with open("ml/val_targets.json", "r", encoding="utf-8") as f:
        val_targets = json.load(f)

    print(f"Loaded {len(train_targets)} train targets and {len(val_targets)} validation targets.")

    # 2. Initialize Training Client
    client = tinker.ServiceClient(api_key=api_key)
    base_model = "Qwen/Qwen3-8B"
    print(f"Connecting to Thinking Machines Lab for base model: {base_model}...")

    training_client = client.create_lora_training_client(
        base_model=base_model,
        rank=16,
        user_metadata={"project": "noted-study-planner", "experiment": "phase12-full-sft"}
    )
    tokenizer = training_client.get_tokenizer()

    # 3. Tokenize train items into Datum format
    print("Tokenizing and preparing training data...")
    train_data = []
    total_tokens = 0

    for item in train_targets:
        p_ids = tokenizer.encode(item["prompt"])
        c_ids = tokenizer.encode(item["completion"])
        full_ids = p_ids + c_ids
        total_tokens += len(full_ids)

        weights = [0.0] * len(p_ids[:-1]) + [1.0] * len(c_ids)
        datum = types.Datum(
            model_input=types.ModelInput.from_ints(full_ids[:-1]),
            loss_fn_inputs={
                "target_tokens": full_ids[1:],
                "weights": weights
            }
        )
        train_data.append(datum)

    # 4. Tokenize validation items
    val_data = []
    for item in val_targets:
        p_ids = tokenizer.encode(item["prompt"])
        c_ids = tokenizer.encode(item["completion"])
        full_ids = p_ids + c_ids
        weights = [0.0] * len(p_ids[:-1]) + [1.0] * len(c_ids)
        datum = types.Datum(
            model_input=types.ModelInput.from_ints(full_ids[:-1]),
            loss_fn_inputs={
                "target_tokens": full_ids[1:],
                "weights": weights
            }
        )
        val_data.append(datum)

    rate_per_m = 0.44
    est_cost = (total_tokens / 1_000_000.0) * rate_per_m
    print(f"Prepared {len(train_data)} training samples ({total_tokens:,} tokens). Estimated training cost: ${est_cost:.4f}")

    # 5. Training Loop
    # Batch size 15 -> ~49 steps for 735 examples
    batch_size = 15
    num_steps = len(train_data) // batch_size
    print(f"\nStarting SFT training loop ({num_steps} steps, batch_size={batch_size})...")

    step_losses = []
    start_time = time.perf_counter()

    for step in range(num_steps):
        batch = train_data[step * batch_size : (step + 1) * batch_size]
        
        fwd_bwd_future = training_client.forward_backward(batch, "cross_entropy")
        optim_future = training_client.optim_step(
            types.AdamParams(learning_rate=2e-4)
        )

        fwd_result = fwd_bwd_future.result()
        optim_future.result()
        
        loss_val = fwd_result.metrics.get("loss:sum", fwd_result.metrics.get("loss", 0.0))
        # Average loss per batch token
        batch_tokens = sum(len(d.model_input.to_ints()) for d in batch)
        avg_loss = loss_val / max(1, batch_tokens) if batch_tokens > 0 else loss_val
        step_losses.append(avg_loss)

        if (step + 1) % 10 == 0 or step == 0 or step == num_steps - 1:
            print(f"  Step {step + 1}/{num_steps} -> Loss (sum): {loss_val:.2f} | Per-token: {avg_loss:.4f}")

    train_elapsed = time.perf_counter() - start_time
    print(f"\nTraining completed in {train_elapsed:.2f}s ({train_elapsed/60.0:.2f} mins).")

    # 6. Evaluate on Validation Split
    print("Evaluating validation loss on held-out validation targets...")
    val_batch_size = 15
    val_steps = len(val_data) // val_batch_size
    val_losses = []

    for v_step in range(val_steps):
        v_batch = val_data[v_step * val_batch_size : (v_step + 1) * val_batch_size]
        fwd_future = training_client.forward(v_batch, "cross_entropy")
        fwd_res = fwd_future.result()
        v_loss = fwd_res.metrics.get("loss:sum", 0.0)
        v_tokens = sum(len(d.model_input.to_ints()) for d in v_batch)
        val_losses.append(v_loss / max(1, v_tokens))

    avg_val_loss = sum(val_losses) / len(val_losses) if val_losses else 0.0
    print(f"Average Validation Loss per token: {avg_val_loss:.4f}")

    # 7. Save weights for sampler
    print("\nSaving fine-tuned LoRA weights for sampling...")
    sampler_handle_future = training_client.save_weights_for_sampler("noted-study-planner-lora-v1")
    sampler_handle = sampler_handle_future.result()
    print(f"Saved sampler handle: {sampler_handle}")

    # Also obtain a live sampling client
    sampler = training_client.save_weights_and_get_sampling_client()

    training_metadata = {
        "base_model": base_model,
        "sampler_handle": getattr(sampler_handle, "path", str(sampler_handle)),
        "train_samples": len(train_data),
        "val_samples": len(val_data),
        "total_train_tokens": total_tokens,
        "est_training_cost_usd": round(est_cost, 4),
        "initial_loss_per_token": round(step_losses[0], 4) if step_losses else 0,
        "final_loss_per_token": round(step_losses[-1], 4) if step_losses else 0,
        "avg_val_loss_per_token": round(avg_val_loss, 4),
        "elapsed_seconds": round(train_elapsed, 2)
    }

    with open("ml/training_summary.json", "w", encoding="utf-8") as f:
        json.dump(training_metadata, f, indent=2)

    print("\nSaved training summary to ml/training_summary.json.")
    print("Full training run successful!")

if __name__ == "__main__":
    run_full_training()
