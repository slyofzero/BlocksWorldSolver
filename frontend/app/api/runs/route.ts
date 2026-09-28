import { NextResponse } from 'next/server';
import { getAvailableRuns, getDefaultRunId } from '@/app/lib/runService';

export async function GET() {
  try {
    const runs = getAvailableRuns();
    const defaultRunId = getDefaultRunId();
    return NextResponse.json({ runs, defaultRunId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to list runs' }, { status: 500 });
  }
}
