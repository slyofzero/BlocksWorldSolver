import { NextRequest, NextResponse } from 'next/server';
import { saveUploadedFileStream } from '@/app/lib/runService';
import { Readable } from 'stream';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided in form data' }, { status: 400 });
    }

    // Convert Web ReadableStream to Node Readable and stream directly to disk
    const nodeStream = Readable.fromWeb(file.stream() as any);
    const result = await saveUploadedFileStream(file.name, nodeStream);

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('File upload error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to process and save uploaded JSON file' },
      { status: 500 }
    );
  }
}
