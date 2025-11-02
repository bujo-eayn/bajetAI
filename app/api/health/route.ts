import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Health check endpoint
 * Tests database connection and returns system status
 *
 * GET /api/health
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Test database connection by querying a simple count
    const { error } = await supabase.from('profiles').select('count', { count: 'exact' });

    if (error) {
      // Database connection failed
      return NextResponse.json(
        {
          status: 'error',
          message: 'Database connection failed',
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }

    // Everything is working
    return NextResponse.json({
      status: 'ok',
      message: 'bajetAI is running',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // Unexpected error
    return NextResponse.json(
      {
        status: 'error',
        message: 'Unexpected error occurred',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
