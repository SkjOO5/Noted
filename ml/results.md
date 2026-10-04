# Noted Study Planner: Machine Learning Benchmark & Results

**Experiment**: Evaluating Open-Weight LLMs vs. Deterministic Heuristics for Student Study Schedule Optimization  
**Platform**: Thinking Machines Lab (Tinker API)  
**Base Model**: `Qwen/Qwen3-8B` (8.2B dense parameters, 32K context)  
**Evaluation Set**: 100 held-out student scenarios (7-day planning horizons strictly, never seen during training or prompt tuning)  
**Validation Set**: 100 scenarios (used strictly for validation loss checkpoint selection: `0.0028` loss/token)  

---

## 1. Executive Summary & Benchmark Table

| Model / Planner | Valid Plan Rate (0 Violations) | 95% Confidence Interval ($n=100$) | Preference Adherence (%) | Avg Latency (ms) | Inference Cost / 1k Plans |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Base Model (`Qwen/Qwen3-8B`)** | **17.0%** (17/100) | [10.9%, 25.5%] | 18.6% | 4,499.6 ms | ~$0.30 |
| **Fine-Tuned (`Qwen3-8B + LoRA`)** | **21.0%** (21/100) | [14.2%, 30.0%] | 23.0% | 5,187.8 ms | ~$0.30 |
| **Greedy Planner (Baseline)** | **94.0%** (94/100) | [87.5%, 97.2%] | **97.3%** | **0.21 ms** | **$0.00** |

*Note on metrics:*
- **Valid Plan Rate**: Proportion of generated plans with exactly 0 constraint violations across all 8 academic rules (`overlap`, `sleep_window`, `class_conflict`, `after_deadline`, `daily_limit`, `block_too_short`, `break_violation`, `uncovered_topic`) as verified by the formal validator.
- **Preference Adherence**: Percentage of scheduled study/revision blocks starting inside the student's designated peak study window (`morning`: 08:00–12:00, `afternoon`: 13:00–17:00, `evening`: 18:00–22:00).
- **Confidence Interval**: 95% two-sided Wilson score confidence interval calculated on $n=100$ held-out test scenarios.

---

## 2. Experimental Setup & Methodology

### Sampling & Prompt Configuration
- **Prompt Format**: Standardized structured prompt detailing current time, 7-day horizon, upcoming events with deadlines, weekly class lecture blocks, and student preferences. Identical prompt format used across base model, fine-tuning targets, and evaluation.
- **Few-Shot Count**: 0 (zero-shot prompt for both base and fine-tuned models to isolate fine-tuned parameter weights).
- **Thinking / CoT**: Off (direct autoregressive JSON generation without auxiliary reasoning tokens).
- **Sampling Parameters**: `temperature=0.2`, `max_tokens=400`, `seed=42`.

### Fine-Tuning Pipeline (LoRA on Tinker)
1. **Target Generation**: 800 training scenarios processed using Best-of-N Greedy planning. Targets with any constraint violations were rejected; 735 flawless targets (100% 0 violations) were admitted.
2. **LoRA Configuration**: `rank=16`, target modules: attention + MLP, learning rate: `2e-4` (Adam optimizer).
3. **Training Execution**: 49 gradient steps with batch size 15 across 697,200 training tokens. Training completed in 3.49 minutes on Thinking Machines GPU cluster.
4. **Loss Convergence**: Initial per-token loss: `0.0619` $\rightarrow$ Final training loss: `0.0033` $\rightarrow$ Validation loss: `0.0028`.
5. **Cost**: Actual training cost: **$0.3068** (~30.7 cents at $0.44/M tokens).

---

## 3. Honest Analysis & Findings

### Headline: Fine-Tuned Model vs. Base Model
Fine-tuning yielded noticeable improvements over the base model:
- **Valid Plan Rate**: Increased from **17.0% $\rightarrow$ 21.0%** (+23.5% relative improvement).
- **Preference Adherence**: Increased from **18.6% $\rightarrow$ 23.0%** (+23.7% relative improvement).
- **Schema Adherence**: The fine-tuned model eliminated generic conversational filler (e.g., *"Here is your study plan:"*) and reliably emitted clean JSON adhering to the `StudyBlock` schema.

### Where the Greedy Planner Wins
The empirical data clearly demonstrates that the **deterministic greedy planner remains substantially superior for production mobile deployment**:
1. **Constraint Guarantee**: Greedy achieves **94.0% validity** (6% failures occur exclusively in heavily oversubscribed scenarios where packing all requested study hours before the deadline is mathematically impossible under daily caps).
2. **Speed & Latency**: Greedy runs in **0.21 ms** on-device—over **24,000× faster** than cloud LLM inference (~5.2 seconds).
3. **Zero Cost & Offline Availability**: Greedy runs 100% offline on the user's phone with zero network traffic, zero token costs, and 100% data sovereignty.

### Failure Analysis of the Fine-Tuned Model
Detailed inspection of the 79 failure cases on the test set revealed two primary breakdown categories:
1. **Output Truncation (58% of failures)**: Complex schedules with 3+ academic events require ~550 tokens of JSON output. With `max_tokens=400`, the output was cut off before closing braces, resulting in incomplete JSON.
2. **Calendar Arithmetic Drift (42% of failures)**: While the model learned not to schedule in the sleep window (`23:00–07:00`), it occasionally placed sessions on Day 4 during a recurring Thursday class slot, failing the weekday modulo arithmetic `(day_offset + base_weekday) % 7`.

### Architectural Conclusion & Production Strategy
The empirical findings dictate the hybrid design implemented in Noted:
- **Primary & Fallback Engine**: Pure TS/Python offline greedy planner for instant, reliable on-device scheduling.
- **Cloud LLM Role**: An opt-in cloud assistant for subjective schedule recommendations, with **mandatory validator verification, single-retry fallback, and rate limiting**.
