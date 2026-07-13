/**
 * Rate limiter stub.
 *
 * The original implementation called a non-existent Supabase Edge Function
 * ('rate-limit-demo'). Until a proper rate-limiting solution is implemented
 * (e.g. server-side middleware), this always allows the request through so
 * the app's functionality isn't blocked.
 */
export const checkRateLimit = async (_path, _action = 'check_limit') => {
  // Always allow — rate limiting should be enforced server-side.
  return { allowed: true, remaining: null, error: null };
};
