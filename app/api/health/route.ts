import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({
    serperConfigured: Boolean(process.env.SERPER_API_KEY),
    openrouterConfigured: Boolean(process.env.OPENROUTER_API_KEY),
  });
}
