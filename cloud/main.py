import os
import time
import logging
from collections import defaultdict
from fastapi import FastAPI, Request, Response, HTTPException, Header, status
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

try:
    from .models import PlanRequest, PlanResponse, HealthResponse
    from .planner.tinker_backend import TinkerBackend
    from .planner.greedy import generate_greedy_plan
    from .planner.validator import validate_plan
except (ImportError, ValueError):
    from models import PlanRequest, PlanResponse, HealthResponse
    from planner.tinker_backend import TinkerBackend
    from planner.greedy import generate_greedy_plan
    from planner.validator import validate_plan

# Configure logger with zero body logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("noted.cloud")

# Rate limiting data structures (in-memory)
# Note: In-memory counters reset on server restart
MINUTE_LIMIT = 10
DAILY_LIMIT = 200

minute_requests = defaultdict(list)
daily_requests = defaultdict(list)

def check_rate_limits(client_ip: str):
    now = time.time()
    
    # 1. Clean minute window (> 60s ago)
    minute_requests[client_ip] = [t for t in minute_requests[client_ip] if now - t < 60]
    if len(minute_requests[client_ip]) >= MINUTE_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded: maximum 10 requests per minute."
        )

    # 2. Clean daily window (> 86400s ago)
    daily_requests[client_ip] = [t for t in daily_requests[client_ip] if now - t < 86400]
    if len(daily_requests[client_ip]) >= DAILY_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Daily request cap reached: maximum 200 requests per day."
        )

    minute_requests[client_ip].append(now)
    daily_requests[client_ip].append(now)

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
    description="Privacy-first study planning service for Noted powered by Thinking Machines Lab.",
    version="1.0.0"
)

# CORS configuration allowing cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(PrivacyPreservingLoggingMiddleware)

# Initialize Tinker backend instance
tinker_backend = TinkerBackend()

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health status check endpoint."""
    return HealthResponse(
        status="healthy",
        version="1.0.0",
        service="noted-cloud"
    )

@app.post("/plan", response_model=PlanResponse)
async def create_plan(
    request: PlanRequest,
    req: Request,
    x_noted_app_token: str = Header(default="noted-app-token-v1")
):
    """
    Generate an optimized study schedule from structured time slots & deadlines.
    - App token authentication required.
    - Strict privacy: only structured timestamps, class hours, and topics are processed.
    - Rate-limited and capped against abuse.
    - Validates plan output and falls back cleanly to offline greedy planner.
    """
    # 1. App token validation
    expected_token = os.environ.get("NOTED_APP_TOKEN", "noted-app-token-v1")
    if x_noted_app_token != expected_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-Noted-App-Token header."
        )

    # 2. Rate limiting check
    client_ip = req.client.host if req.client else "127.0.0.1"
    check_rate_limits(client_ip)

    # 3. Input size limits
    if len(request.events) > 50:
        raise HTTPException(status_code=400, detail="Too many events: maximum 50 events allowed.")
    if len(request.classes) > 20:
        raise HTTPException(status_code=400, detail="Too many class slots: maximum 20 classes allowed.")
    if len(request.topics) > 50:
        raise HTTPException(status_code=400, detail="Too many topics: maximum 50 topics allowed.")
    if request.horizonDays > 30:
        raise HTTPException(status_code=400, detail="Horizon too large: maximum 30 days allowed.")

    start_time = time.perf_counter()
    
    # 4. Generate plan via Tinker backend (with validation, retry, and greedy fallback)
    plan, source, violations = tinker_backend.plan(request)
    
    latency_ms = (time.perf_counter() - start_time) * 1000.0
    
    return PlanResponse(
        plan=plan,
        source=source, # 'tinker' | 'greedy' | 'fallback'
        violations=violations,
        latencyMs=round(latency_ms, 2)
    )
