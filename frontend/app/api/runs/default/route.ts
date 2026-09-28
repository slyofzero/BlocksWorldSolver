import { NextRequest, NextResponse } from 'next/server';
import { getDefaultRunId, setDefaultRunId } from '@/app/lib/runService';

export async function GET() {
  try {
    const defaultRunId = getDefaultRunId();
    return NextResponse.json({ defaultRunId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to get default save' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const defaultRunId = typeof body.defaultRunId === 'string' ? body.defaultRunId.trim() : null;
    setDefaultRunId(defaultRunId);
    return NextResponse.json({ success: true, defaultRunId: getDefaultRunId() });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to set default save' }, { status: 400 });
  }
}
