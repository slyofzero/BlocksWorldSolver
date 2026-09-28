import { NextRequest, NextResponse } from 'next/server';
import { getEpisodeList } from '@/app/lib/runService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params;
    const url = new URL(request.url);

    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);
    const filter = (url.searchParams.get('filter') as 'all' | 'positive' | 'negative') || 'all';

    const result = getEpisodeList(runId, { page, limit, filter });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to get episodes' }, { status: 500 });
  }
}
