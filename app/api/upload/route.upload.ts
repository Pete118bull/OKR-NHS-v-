import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI();

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const threadId = formData.get('threadId') as string;
    if (!file || !threadId) {
      return NextResponse.json({ error: 'Missing file or threadId' }, { status: 400 });
    }

    const uploadedFile = await openai.files.create({
      file,
      purpose: 'assistants',
    });

    await openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: 'Please review this document for OKRs.',
      attachments: [{ file_id: uploadedFile.id }],
    });

    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: process.env.OKR_ASSISTANT_ID!,
      instructions: `Your existing instructions here...`.trim(),
    });

    let runStatus = run.status;
    while (!['completed', 'failed', 'cancelled'].includes(runStatus)) {
      await new Promise((r) => setTimeout(r, 2000));
      const updated = await openai.beta.threads.runs.retrieve({
        thread_id: threadId,
        run_id: run.id,
      });
      runStatus = updated.status;
    }

    if (runStatus !== 'completed') {
      return NextResponse.json({ error: 'Assistant run failed or was cancelled.' }, { status: 500 });
    }

    const messageList = await openai.beta.threads.messages.list(threadId);
    const latest = messageList.data.find((m) => m.role === 'assistant');
    const reply =
      latest?.content?.[0]?.type === 'text'
        ? latest.content[0].text.value
        : '[No assistant response found]';

    return NextResponse.json({ thread_id: threadId, run_id: run.id, reply });
  } catch (err: any) {
    console.error('Upload handler error:', err);
    return NextResponse.json({
      error: err.message || 'Upload failed',
    }, { status: 500 });
  }
}







