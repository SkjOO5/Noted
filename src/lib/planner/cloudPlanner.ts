import { PlanRequest, Plan, PlanViolation } from './types';
import { greedyPlan } from './greedyPlan';
import { validatePlan } from './validatePlan';

export interface CloudPlanResponse {
  plan: Plan;
  source: 'greedy' | 'tinker' | 'fallback';
  violations: PlanViolation[];
  latencyMs: number;
}

/**
 * Fetch an optimized study plan from Noted Cloud API if available,
 * with zero raw chat content transmitted (strict structured privacy).
 * Seamlessly falls back to local offline greedy planner on any network issue or timeout.
 */
export async function getPlanWithFallback(
  request: PlanRequest,
  cloudBaseUrl?: string,
  timeoutMs: number = 4000
): Promise<CloudPlanResponse> {
  const effectiveBaseUrl =
    cloudBaseUrl ||
    (typeof window !== 'undefined' ? localStorage.getItem('noted_cloud_url') : null) ||
    (import.meta.env.VITE_NOTED_CLOUD_URL as string | undefined);

  if (!effectiveBaseUrl) {
    // Pure local offline path
    const start = performance.now();
    const plan = greedyPlan(request);
    const violations = validatePlan(request, plan);
    return {
      plan,
      source: 'greedy',
      violations,
      latencyMs: performance.now() - start,
    };
  }

  // Attempt cloud planner call with strict timeout
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const start = performance.now();
    const res = await fetch(`${effectiveBaseUrl.replace(/\/+$/, '')}/plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      return {
        plan: data.plan,
        source: data.source || 'greedy',
        violations: data.violations || [],
        latencyMs: data.latencyMs ?? (performance.now() - start),
      };
    }
  } catch (err) {
    console.warn('[Noted Cloud] Cloud planner unreachable, falling back to local greedy engine:', err);
  }

  // Fallback to local planner engine
  const start = performance.now();
  const plan = greedyPlan(request);
  const violations = validatePlan(request, plan);
  return {
    plan,
    source: 'fallback',
    violations,
    latencyMs: performance.now() - start,
  };
}
