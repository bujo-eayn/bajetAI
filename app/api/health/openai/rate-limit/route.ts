// GET /api/health/openai/rate-limit
// Returns current OpenAI API rate limit statistics

import { NextResponse } from 'next/server';
import { getRateLimitStats } from '@/lib/services/rateLimiter';

export async function GET() {
  try {
    const stats = getRateLimitStats('openai');

    // Calculate time until reset in human-readable format
    const timeUntilResetHours = Math.floor(stats.timeUntilReset / (1000 * 60 * 60));
    const timeUntilResetMinutes = Math.floor((stats.timeUntilReset % (1000 * 60 * 60)) / (1000 * 60));

    return NextResponse.json({
      ok: true,
      rateLimit: {
        current: stats.count,
        limit: stats.limit,
        remaining: stats.remaining,
        percentUsed: Math.round(stats.percentUsed * 10) / 10, // Round to 1 decimal place
        resetAt: stats.resetAt.toISOString(),
        timeUntilReset: {
          milliseconds: stats.timeUntilReset,
          hours: timeUntilResetHours,
          minutes: timeUntilResetMinutes,
          formatted: `${timeUntilResetHours}h ${timeUntilResetMinutes}m`,
        },
        status: stats.percentUsed >= 90
          ? 'critical'
          : stats.percentUsed >= 75
          ? 'warning'
          : stats.percentUsed >= 50
          ? 'notice'
          : 'normal',
      },
      message: stats.percentUsed >= 90
        ? 'Rate limit critically high - falling back to HuggingFace'
        : stats.percentUsed >= 75
        ? 'Rate limit high - approaching daily limit'
        : 'Rate limit healthy',
    });
  } catch (error) {
    console.error('OpenAI rate limit stats error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to retrieve rate limit statistics',
      },
      { status: 500 }
    );
  }
}
