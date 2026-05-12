import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // TEMP MOCK RESPONSE (replace with Whisper later)
    return NextResponse.json({
      text: 'This is a mocked transcription. Your voice system is working.',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Transcription failed' },
      { status: 500 }
    );
  }
}