import { NextRequest } from 'next/server';
import { runResearchPipeline } from '@/lib/pipeline';
import type { ProgressEvent } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const input: string | undefined = body?.input;
  const model: string | undefined = body?.model;

  if (!input || !model) {
    return new Response(JSON.stringify({ error: 'Missing "input" or "model" in request body.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: ProgressEvent) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
      };

      try {
        emit({ type: 'progress', step: 'start', percent: 2, message: 'Starting research...' });
        const result = await runResearchPipeline(input, model, emit);
        emit({ type: 'result', percent: 100, message: 'Research complete.', data: result });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
        emit({ type: 'error', message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
