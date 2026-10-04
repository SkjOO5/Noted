import json
import random
from datetime import datetime, timedelta
from typing import List, Dict, Any

SUBJECTS = [
    "Database Management Systems",
    "Computer Networks",
    "Operating Systems",
    "Algorithms & Data Structures",
    "Linear Algebra",
    "Machine Learning Foundations",
    "Software Engineering",
    "Theory of Computation",
    "Discrete Mathematics",
    "Compiler Design"
]

TOPICS = {
    "Database Management Systems": ["B-Tree & Hash Indexing", "SQL Joins & Subqueries", "Normalization (BCNF)", "ACID & Concurrency Control", "Query Execution Plans"],
    "Computer Networks": ["TCP Handshake & Congestion Control", "Subnetting & CIDR Math", "DNS & HTTP/3 Protocols", "BGP & Routing Algorithms", "TLS 1.3 Cryptography"],
    "Operating Systems": ["Process Synchronization & Semaphores", "Virtual Memory & Page Replacement", "Deadlock Avoidance & Bankers Algo", "CPU Scheduling (CFS)", "File System Inodes"],
    "Algorithms & Data Structures": ["Dynamic Programming (Knapsack)", "Graph Shortest Paths (Dijkstra)", "Red-Black Tree Rotations", "Divide and Conquer (Master Theorem)", "Disjoint Set Union (DSU)"],
    "Linear Algebra": ["Eigenvalues & SVD Decomposition", "Vector Spaces & Orthogonality", "Matrix Inverses & Determinants", "Gaussian Elimination", "Positive Definite Matrices"],
    "Machine Learning Foundations": ["Backpropagation Calculus", "Gradient Descent & Adam", "Cross-Entropy Loss Derivations", "Regularization (L1/L2)", "Decision Trees & Ensembles"],
    "Software Engineering": ["Design Patterns (Observer/Factory)", "SOLID Principles & Clean Code", "CI/CD Pipeline Stages", "Unit & Integration Testing", "API Contract Versioning"],
    "Theory of Computation": ["DFA & NFA Equivalence", "Pumping Lemma for Regular Languages", "Context-Free Grammars", "Turing Machine Halting Problem", "NP-Completeness Reductions"],
    "Discrete Mathematics": ["Graph Theory & Planarity", "Combinatorics & Generating Functions", "Modular Arithmetic & RSA", "Mathematical Induction", "Recurrence Relations"],
    "Compiler Design": ["Lexical Analysis & Flex", "LR(1) Parsing & Yacc", "Abstract Syntax Trees (AST)", "Intermediate Code Generation", "Register Allocation (Graph Coloring)"]
}

CLASS_TEMPLATES = [
    {"weekday": 1, "startMinute": 540, "endMinute": 600, "subject": "Core Lecture 1"},     # Mon 9:00 - 10:00
    {"weekday": 1, "startMinute": 660, "endMinute": 750, "subject": "Core Lecture 2"},     # Mon 11:00 - 12:30
    {"weekday": 2, "startMinute": 600, "endMinute": 660, "subject": "Tutorial Session"},    # Tue 10:00 - 11:00
    {"weekday": 2, "startMinute": 840, "endMinute": 960, "subject": "Lab Practical"},       # Tue 14:00 - 16:00
    {"weekday": 3, "startMinute": 540, "endMinute": 600, "subject": "Core Lecture 1"},     # Wed 9:00 - 10:00
    {"weekday": 3, "startMinute": 660, "endMinute": 720, "subject": "Core Lecture 3"},     # Wed 11:00 - 12:00
    {"weekday": 4, "startMinute": 600, "endMinute": 720, "subject": "Department Seminar"},  # Thu 10:00 - 12:00
    {"weekday": 4, "startMinute": 840, "endMinute": 960, "subject": "Systems Lab"},         # Thu 14:00 - 16:00
    {"weekday": 5, "startMinute": 540, "endMinute": 630, "subject": "Core Lecture 2"},     # Fri 9:00 - 10:30
    {"weekday": 5, "startMinute": 660, "endMinute": 720, "subject": "Review & Q&A"},       # Fri 11:00 - 12:00
]

SLEEP_WINDOWS = [
    ("23:00", "07:00"),
    ("22:00", "06:00"),
    ("00:00", "08:00")
]

BEST_TIMES = ["evening", "evening", "evening", "afternoon", "morning"]

def generate_scenario(seed: int, scenario_id: int) -> Dict[str, Any]:
    rng = random.Random(seed)
    
    # 7-day horizon strictly per specification amendment 3
    base_date = datetime(2026, 10, 12, 9, 0, 0) # Monday morning 9:00 AM
    horizon_days = 7
    horizon_end = base_date + timedelta(days=horizon_days)

    sleep_start, sleep_end = rng.choice(SLEEP_WINDOWS)
    best_time = rng.choice(BEST_TIMES)
    block_mins = rng.choice([45, 60])
    max_study = rng.choice([180, 240, 300])

    prefs = {
        "sleepStart": sleep_start,
        "sleepEnd": sleep_end,
        "maxStudyMinutesPerDay": max_study,
        "blockMinutes": block_mins,
        "bestTime": best_time,
        "breakMinutes": 15,
        "bufferHoursBeforeDeadline": 2
    }

    # Pick 2-4 college classes from template
    num_classes = rng.randint(2, 4)
    classes = rng.sample(CLASS_TEMPLATES, num_classes)
    for idx, c in enumerate(classes):
        c["id"] = idx + 1

    # Pick 1-3 academic events
    num_events = rng.randint(1, 3)
    chosen_subjects = rng.sample(SUBJECTS, num_events)
    events = []
    topics = []
    topic_counter = 1

    for idx, subj in enumerate(chosen_subjects):
        ev_id = idx + 1
        kind = rng.choice(["quiz", "assignment", "exam"])
        
        # Deadlines spaced between day 2 and day 7
        if kind == "quiz":
            days_out = rng.randint(2, 4)
            hour = rng.choice([10, 11, 14])
        elif kind == "assignment":
            days_out = rng.randint(3, 6)
            hour = rng.choice([17, 20, 22])
        else: # exam
            days_out = rng.randint(4, 7)
            hour = rng.choice([9, 14])

        ev_start = (base_date + timedelta(days=days_out)).replace(hour=hour, minute=0, second=0)
        
        events.append({
            "id": ev_id,
            "kind": kind,
            "subject": subj,
            "title": f"{subj} {kind.capitalize()}",
            "startAt": ev_start.strftime("%Y-%m-%dT%H:%M:%S")
        })

        # 1-3 topics for this event
        cand_topics = TOPICS.get(subj, ["General Subject Review"])
        num_topics = rng.randint(1, min(3, len(cand_topics)))
        sampled_topics = rng.sample(cand_topics, num_topics)

        for t_text in sampled_topics:
            topics.append({
                "id": topic_counter,
                "eventId": ev_id,
                "text": t_text,
                "isDone": False
            })
            topic_counter += 1

    return {
        "id": scenario_id,
        "now": base_date.strftime("%Y-%m-%dT%H:%M:%S"),
        "horizonDays": horizon_days,
        "events": events,
        "classes": classes,
        "topics": topics,
        "prefs": prefs
    }

def generate_all_scenarios():
    print("Generating 1,000 synthetic student scenarios (800 train / 100 val / 100 test)...")
    
    # 800 train, 100 val, 100 test
    scenarios = [generate_scenario(10000 + i, i + 1) for i in range(1000)]
    
    train_set = scenarios[:800]
    val_set = scenarios[800:900]
    test_set = scenarios[900:1000]

    with open("ml/scenarios_train.json", "w", encoding="utf-8") as f:
        json.dump(train_set, f, indent=2)
    with open("ml/scenarios_val.json", "w", encoding="utf-8") as f:
        json.dump(val_set, f, indent=2)
    with open("ml/scenarios_test.json", "w", encoding="utf-8") as f:
        json.dump(test_set, f, indent=2)

    print(f"Successfully generated:")
    print(f"  - ml/scenarios_train.json: {len(train_set)} scenarios")
    print(f"  - ml/scenarios_val.json:   {len(val_set)} scenarios")
    print(f"  - ml/scenarios_test.json:  {len(test_set)} scenarios (held-out)")

if __name__ == "__main__":
    generate_all_scenarios()
