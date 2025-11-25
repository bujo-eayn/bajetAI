// Rate Limiter Service for HuggingFace API
// Tracks API call count to prevent exceeding free tier limits (24k requests/month ~800/day)

type RateLimitConfig = {
  dailyLimit: number;
  resetHour: number; // UTC hour to reset (default: 0 = midnight UTC)
};

type RateLimitState = {
  count: number;
  resetAt: Date;
};

// In-memory storage for rate limit tracking
// Note: This resets on server restart. For production, consider Redis or persistent storage.
const rateLimitState: Map<string, RateLimitState> = new Map();

/**
 * Get rate limiter configuration from environment or defaults
 */
function getConfig(): RateLimitConfig {
  const dailyLimit = parseInt(
    process.env.HUGGING_FACE_DAILY_LIMIT || '800',
    10
  );
  const resetHour = parseInt(
    process.env.HUGGING_FACE_RESET_HOUR || '0',
    10
  );

  return {
    dailyLimit,
    resetHour,
  };
}

/**
 * Calculate next reset time (midnight UTC or configured hour)
 */
function getNextResetTime(resetHour: number): Date {
  const now = new Date();
  const next = new Date(now);

  // Set to configured hour UTC
  next.setUTCHours(resetHour, 0, 0, 0);

  // If we've passed the reset hour today, move to tomorrow
  if (now.getUTCHours() >= resetHour) {
    next.setUTCDate(next.getUTCDate() + 1);
  }

  return next;
}

/**
 * Initialize or get rate limit state for a service
 */
function getState(service: string = 'huggingface'): RateLimitState {
  const config = getConfig();
  const existing = rateLimitState.get(service);

  // Check if existing state is still valid (not past reset time)
  if (existing && new Date() < existing.resetAt) {
    return existing;
  }

  // Create new state
  const newState: RateLimitState = {
    count: 0,
    resetAt: getNextResetTime(config.resetHour),
  };

  rateLimitState.set(service, newState);
  return newState;
}

/**
 * Check if we can make an API call (within rate limit)
 * Returns { allowed: boolean, remaining: number, resetAt: Date }
 */
export function checkRateLimit(
  service: string = 'huggingface'
): {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  current: number;
  limit: number;
} {
  const config = getConfig();
  const state = getState(service);

  const allowed = state.count < config.dailyLimit;
  const remaining = Math.max(0, config.dailyLimit - state.count);

  return {
    allowed,
    remaining,
    resetAt: state.resetAt,
    current: state.count,
    limit: config.dailyLimit,
  };
}

/**
 * Increment the API call counter
 * Call this AFTER a successful API request
 */
export function incrementRateLimit(service: string = 'huggingface'): void {
  const state = getState(service);
  state.count += 1;

  console.log(`[RateLimiter] ${service}: ${state.count} calls today`);

  // Log warning when approaching limit
  const config = getConfig();
  const percentUsed = (state.count / config.dailyLimit) * 100;

  if (percentUsed >= 90) {
    console.warn(
      `[RateLimiter] WARNING: ${service} at ${percentUsed.toFixed(1)}% of daily limit (${state.count}/${config.dailyLimit})`
    );
  } else if (percentUsed >= 75) {
    console.warn(
      `[RateLimiter] NOTICE: ${service} at ${percentUsed.toFixed(1)}% of daily limit (${state.count}/${config.dailyLimit})`
    );
  }
}

/**
 * Manually reset rate limit counter
 * Useful for testing or manual intervention
 */
export function resetRateLimit(service: string = 'huggingface'): void {
  const config = getConfig();
  rateLimitState.set(service, {
    count: 0,
    resetAt: getNextResetTime(config.resetHour),
  });

  console.log(`[RateLimiter] ${service}: Rate limit reset`);
}

/**
 * Get current rate limit statistics
 * Useful for monitoring and debugging
 */
export function getRateLimitStats(service: string = 'huggingface'): {
  count: number;
  limit: number;
  remaining: number;
  percentUsed: number;
  resetAt: Date;
  timeUntilReset: number; // milliseconds
} {
  const config = getConfig();
  const state = getState(service);

  const remaining = Math.max(0, config.dailyLimit - state.count);
  const percentUsed = (state.count / config.dailyLimit) * 100;
  const timeUntilReset = state.resetAt.getTime() - Date.now();

  return {
    count: state.count,
    limit: config.dailyLimit,
    remaining,
    percentUsed,
    resetAt: state.resetAt,
    timeUntilReset: Math.max(0, timeUntilReset),
  };
}

/**
 * Check if we're approaching the rate limit (>75% used)
 */
export function isApproachingLimit(service: string = 'huggingface'): boolean {
  const stats = getRateLimitStats(service);
  return stats.percentUsed >= 75;
}

/**
 * Check if we've exceeded the rate limit
 */
export function isRateLimitExceeded(service: string = 'huggingface'): boolean {
  const stats = getRateLimitStats(service);
  return stats.count >= stats.limit;
}
