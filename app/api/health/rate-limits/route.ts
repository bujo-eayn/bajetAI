// GET /api/health/rate-limits
// Returns rate limit statistics for all AI providers

import { NextResponse } from 'next/server';
import { getRateLimitStats } from '@/lib/services/rateLimiter';

export async function GET() {
  try {
    const openaiStats = getRateLimitStats('openai');
    const huggingfaceStats = getRateLimitStats('huggingface');

    // Helper function to format time
    const formatTime = (milliseconds: number) => {
      const hours = Math.floor(milliseconds / (1000 * 60 * 60));
      const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
      return {
        milliseconds,
        hours,
        minutes,
        formatted: `${hours}h ${minutes}m`,
      };
    };

    // Helper function to determine status
    const getStatus = (percentUsed: number) => {
      if (percentUsed >= 90) return 'critical';
      if (percentUsed >= 75) return 'warning';
      if (percentUsed >= 50) return 'notice';
      return 'normal';
    };

    return NextResponse.json({
      ok: true,
      providers: {
        openai: {
          current: openaiStats.count,
          limit: openaiStats.limit,
          remaining: openaiStats.remaining,
          percentUsed: Math.round(openaiStats.percentUsed * 10) / 10,
          resetAt: openaiStats.resetAt.toISOString(),
          timeUntilReset: formatTime(openaiStats.timeUntilReset),
          status: getStatus(openaiStats.percentUsed),
        },
        huggingface: {
          current: huggingfaceStats.count,
          limit: huggingfaceStats.limit,
          remaining: huggingfaceStats.remaining,
          percentUsed: Math.round(huggingfaceStats.percentUsed * 10) / 10,
          resetAt: huggingfaceStats.resetAt.toISOString(),
          timeUntilReset: formatTime(huggingfaceStats.timeUntilReset),
          status: getStatus(huggingfaceStats.percentUsed),
        },
      },
      summary: {
        totalCalls: openaiStats.count + huggingfaceStats.count,
        totalLimit: openaiStats.limit + huggingfaceStats.limit,
        totalRemaining: openaiStats.remaining + huggingfaceStats.remaining,
        overallStatus:
          openaiStats.percentUsed >= 90 || huggingfaceStats.percentUsed >= 90
            ? 'critical'
            : openaiStats.percentUsed >= 75 || huggingfaceStats.percentUsed >= 75
            ? 'warning'
            : openaiStats.percentUsed >= 50 || huggingfaceStats.percentUsed >= 50
            ? 'notice'
            : 'normal',
      },
    });
  } catch (error) {
    console.error('Rate limits stats error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to retrieve rate limit statistics',
      },
      { status: 500 }
    );
  }
}
