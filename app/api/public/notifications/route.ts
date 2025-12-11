import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const VALID_AREAS = ['planning', 'healthcare', 'education', 'transport'] as const;
type ParticipationArea = (typeof VALID_AREAS)[number];

interface NotificationRequest {
  email: string;
  area: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body: NotificationRequest = await request.json();
    const { email, area } = body;

    // Validation: Email format
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    // Validation: Area
    if (!area || typeof area !== 'string') {
      return NextResponse.json({ error: 'Participation area is required' }, { status: 400 });
    }

    if (!VALID_AREAS.includes(area as ParticipationArea)) {
      return NextResponse.json(
        { error: `Invalid participation area. Must be one of: ${VALID_AREAS.join(', ')}` },
        { status: 400 }
      );
    }

    // Insert subscription (upsert to handle duplicates gracefully)
    const { data, error } = await supabase
      .from('notifications')
      .upsert(
        { email: email.toLowerCase().trim(), area: area.toLowerCase() },
        { onConflict: 'email,area', ignoreDuplicates: false }
      )
      .select()
      .single();

    if (error) {
      console.error('Notification subscription error:', error);

      // Check if it's a unique constraint violation (already subscribed)
      if (error.code === '23505' || error.message?.includes('duplicate')) {
        return NextResponse.json({
          success: true,
          message: `You're already subscribed to ${area.charAt(0).toUpperCase() + area.slice(1)} notifications!`,
          data: null,
        });
      }

      return NextResponse.json(
        { error: 'Failed to subscribe. Please try again later.' },
        { status: 500 }
      );
    }

    const areaName = area.charAt(0).toUpperCase() + area.slice(1);

    return NextResponse.json({
      success: true,
      message: `You'll be notified when ${areaName} participation launches!`,
      data: {
        id: data.id,
        email: data.email,
        area: data.area,
        subscribedAt: data.subscribed_at,
      },
    });
  } catch (error) {
    console.error('Notifications API error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
