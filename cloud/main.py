import time
import logging
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

try:
    from .models import PlanRequest, PlanResponse, HealthResponse
    from .planner.greedy import generate_greedy_plan
    from .planner.validator import validate_plan
except (ImportError, ValueError):
    from models import PlanRequest, PlanResponse, HealthResponse
    from planner.greedy import generate_greedy_plan
    from planner.validator import validate_plan

# Configure logger with zero body logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("noted.cloud")

class PrivacyPreservingLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.perf_counter()
        
        # Strictly log ONLY method, sanitized path, and timing
        # ZERO request body, headers, or query parameters are read or logged
        response: Response = await call_next(request)
        
        process_time_ms = (time.perf_counter() - start_time) * 1000.0
        logger.info(
            f"HTTP {request.method} {request.url.path} -> {response.status_code} "
            f"({process_time_ms:.2f}ms) [Privacy: zero-body logging active]"
        )
        response.headers["X-Response-Time-Ms"] = f"{process_time_ms:.2f}"
        return response

app = FastAPI(
    title="Noted Cloud Service",
    description="Privacy-first offline & cloud study planning service for Noted.",
    version="1.0.0"
)

# CORS configuration allowing cross-origin requests from preview / frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(PrivacyPreservingLoggingMiddleware)

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health status check endpoint."""
    return HealthResponse(
        status="healthy",
        version="1.0.0",
        service="noted-cloud"
    )

@app.post("/plan", response_model=PlanResponse)
async def create_plan(request: PlanRequest):
    """
    Generate an optimized study schedule from structured time slots & deadlines.
    Strict privacy: only structured timestamps, class hours, and topics are processed.
    No raw chat text is accepted or processed.
    """
    start_time = time.perf_counter()
    
    # Generate schedule using greedy heuristic planner
    plan = generate_greedy_plan(request)
    
    # Validate generated plan against all 8 academic constraints
    violations = validate_plan(request, plan)
    
    latency_ms = (time.perf_counter() - start_time) * 1000.0
    
    return PlanResponse(
        plan=plan,
        source="greedy",
        violations=violations,
        latencyMs=round(latency_ms, 2)
    )
