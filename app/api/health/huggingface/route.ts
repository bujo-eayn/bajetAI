/**
 * Health Check: Hugging Face API
 * Tests connectivity to Hugging Face API
 */

import { NextResponse } from 'next/server';
import { testConnection, getCircuitBreakerStatus } from '@/lib/services/huggingFaceClient';

export async function GET() {
  try {
    // Test Hugging Face API connection
    const result = await testConnection();

    // Get circuit breaker status
    const circuitStatus = getCircuitBreakerStatus();

    if (result.success) {
      return NextResponse.json({
        status: 'ok',
        service: 'huggingface',
        timestamp: new Date().toISOString(),
        circuit: {
          isOpen: circuitStatus.isOpen,
          failures: circuitStatus.failures,
        },
      });
    } else {
      return NextResponse.json(
        {
          status: 'error',
          service: 'huggingface',
          error: result.error,
          timestamp: new Date().toISOString(),
          circuit: {
            isOpen: circuitStatus.isOpen,
            failures: circuitStatus.failures,
          },
        },
        { status: 503 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        service: 'huggingface',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
