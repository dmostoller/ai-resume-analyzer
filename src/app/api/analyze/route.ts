// app/api/analyze/route.ts

import { NextRequest, NextResponse } from 'next/server';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import OpenAI from 'openai';
import { getServerSession } from 'next-auth/next';
import { rateLimit } from '../../lib/rate-limit';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not configured');
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

const getIpAddress = (request: NextRequest): string => {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');

  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  if (realIp) {
    return realIp;
  }

  return 'anonymous';
};

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  const ip = getIpAddress(request);

  // Only rate limit non-authenticated users
  if (!session?.user) {
    const { success, reset } = await rateLimit.limit(ip);

    if (!success) {
      return NextResponse.json(
        {
          error: 'Free trial expired. Please sign in to continue.',
          remainingTime: reset
        },
        { status: 429 }
      );
    }
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const jobDescription = formData.get('jobDescription') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF and DOCX files are supported.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size too large. Maximum size is 10MB.' }, { status: 400 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    let resumeText: string;

    try {
      if (file.type === 'application/pdf') {
        const pdfData = await pdfParse(fileBuffer);
        resumeText = pdfData.text;
      } else {
        const docxData = await mammoth.extractRawText({ buffer: fileBuffer });
        resumeText = docxData.value;
      }
    } catch (error) {
      return NextResponse.json({ error: error }, { status: 400 });
    }

    try {
      const [feedbackResponse, keywordResponse] = await Promise.all([
        openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'user',
              content: `Analyze this resume:\n${resumeText}\n\nJob description:\n${
                jobDescription || 'No job description provided.'
              }\n\nProvide detailed feedback on how to improve the resume.`
            }
          ],
          max_tokens: 500
        }),
        openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'user',
              content: `Extract key requirements from:\n${jobDescription || 'No job description provided.'}`
            }
          ],
          max_tokens: 100
        })
      ]);

      return NextResponse.json({
        feedback: feedbackResponse.choices[0].message.content,
        keywords: keywordResponse.choices[0].message.content
      });
    } catch (error) {
      return NextResponse.json({ error: error }, { status: 503 });
    }
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
