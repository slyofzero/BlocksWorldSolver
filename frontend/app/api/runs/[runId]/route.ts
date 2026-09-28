import { NextRequest, NextResponse } from 'next/server';
import { renameRun, deleteRun } from '@/app/lib/runService';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params;
    const result = deleteRun(runId);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete save' }, { status: 400 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params;
    const body = await request.json();
    const newName = body.newName;

    if (!newName || typeof newName !== 'string') {
      return NextResponse.json({ error: 'A valid newName string is required.' }, { status: 400 });
    }

    const result = renameRun(runId, newName);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to rename save' }, { status: 400 });
  }
}
