import { NextRequest, NextResponse } from 'next/server';
import { generateReportPdf } from '@/lib/pdf-generator';
import type { ResearchResult } from '@/lib/types';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result: ResearchResult = body?.result;
    if (!result?.company) {
      return NextResponse.json({ error: 'Missing research result data.' }, { status: 400 });
    }

    const buffer = await generateReportPdf(result);
    const safeName = result.company.name.replace(/[^a-z0-9]+/gi, '_').toLowerCase();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeName}_research_report.pdf"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to generate PDF.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
