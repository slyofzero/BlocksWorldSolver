import { NextResponse } from 'next/server';
import { getAvailableRuns } from '@/app/lib/runService';

export async function GET() {
  try {
    const runs = getAvailableRuns();
    return NextResponse.json({ runs });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to list runs' }, { status: 500 });
  }
}
