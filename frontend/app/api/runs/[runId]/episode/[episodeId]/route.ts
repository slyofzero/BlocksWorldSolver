import { NextRequest, NextResponse } from 'next/server';
import { getEpisodeData } from '@/app/lib/runService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string; episodeId: string }> }
) {
  try {
    const { runId, episodeId } = await params;
    const epIndex = parseInt(episodeId, 10);

    if (isNaN(epIndex)) {
      return NextResponse.json({ error: 'Invalid episode ID' }, { status: 400 });
    }

    const episode = getEpisodeData(runId, epIndex);
    if (!episode) {
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 });
    }

    return NextResponse.json({ episode });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to get episode data' }, { status: 500 });
  }
}
