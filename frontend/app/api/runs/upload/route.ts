import { NextRequest, NextResponse } from 'next/server';
import { saveUploadedRun } from '@/app/lib/runService';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided in form data' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = saveUploadedRun(file.name, buffer);

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('File upload error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to process and save uploaded JSON file' },
      { status: 500 }
    );
  }
}
