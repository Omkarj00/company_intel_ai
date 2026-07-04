import { NextRequest, NextResponse } from 'next/server';
import { generateReportPdf } from '@/lib/pdf-generator';
import { sendReportToDiscord } from '@/lib/discord';
import type { ApplicantInfo, DiscordConfig, ResearchResult } from '@/lib/types';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result: ResearchResult = body?.result;
    const discordConfig: DiscordConfig = body?.discordConfig;
    const applicant: ApplicantInfo = body?.applicant;

    if (!result?.company) {
      return NextResponse.json({ error: 'Missing research result data.' }, { status: 400 });
    }
    if (!discordConfig?.botToken || !discordConfig?.channelId) {
      return NextResponse.json(
        { error: 'Discord Bot Token and Channel ID must be configured in Settings.' },
        { status: 400 }
      );
    }

    const buffer = await generateReportPdf(result);
    const safeName = result.company.name.replace(/[^a-z0-9]+/gi, '_').toLowerCase();
    const filename = `${safeName}_research_report.pdf`;

    await sendReportToDiscord(discordConfig, applicant, result, buffer, filename);

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send report to Discord.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
