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
      const [
        feedbackResponse,
        jobRequirementsResponse,
        atsKeywordsResponse,
        resumeKeywordsResponse,
        resumeRequirementsResponse // New
      ] = await Promise.all([
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
              content: `Extract key requirements from this job description as a numbered list:\n${
                jobDescription || 'No job description provided.'
              }`
            }
          ],
          max_tokens: 100
        }),
        openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'user',
              content: `Extract important ATS keywords from this job description, focusing on skills, technologies, qualifications, and certifications. Format as a comma-separated list:\n${jobDescription || 'No job description provided.'}`
            }
          ],
          max_tokens: 100
        }),
        openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'user',
              content: `Extract all skills, technologies, qualifications, and certifications from this resume as a comma-separated list:\n${resumeText}`
            }
          ],
          max_tokens: 100
        }),
        openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'user',
              content: `Extract key qualifications and requirements from this resume as a numbered list:\n${resumeText}`
            }
          ],
          max_tokens: 100
        })
      ]);
      const resumeKeywordsContent = resumeKeywordsResponse.choices[0]?.message?.content || '';
      const resumeKeywords = resumeKeywordsContent.split(',').map((k) => k.trim().toLowerCase());
      const atsKeywordsContent = atsKeywordsResponse.choices[0]?.message?.content || '';
      const jobKeywords = atsKeywordsContent.split(',').map((k) => k.trim().toLowerCase());

      const matchedKeywords = jobKeywords.filter((keyword) =>
        resumeKeywords.some((resumeKeyword) => resumeKeyword.includes(keyword))
      );
      const missingKeywords = jobKeywords.filter(
        (keyword) => !resumeKeywords.some((resumeKeyword) => resumeKeyword.includes(keyword))
      );
      const jobRequirementsContent = jobRequirementsResponse.choices[0]?.message?.content || '';
      const resumeRequirementsContent = resumeRequirementsResponse.choices[0]?.message?.content || '';

      const jobRequirements = jobRequirementsContent
        .split(/\d+\.\s+/)
        .filter(Boolean)
        .map((req) => req.trim().toLowerCase());

      const resumeRequirements = resumeRequirementsContent
        .split(/\d+\.\s+/)
        .filter(Boolean)
        .map((req) => req.trim().toLowerCase());

      // Match requirements using similarity comparison
      const matchedRequirements = jobRequirements.filter((jobReq) =>
        resumeRequirements.some((resumeReq) => {
          // Check if any resume requirement contains substantial parts of the job requirement
          const jobKeywords = jobReq.split(' ');
          const matchCount = jobKeywords.filter((keyword) =>
            resumeReq.includes(keyword.toLowerCase())
          ).length;
          return matchCount / jobKeywords.length > 0.5; // Match if more than 50% of words match
        })
      );

      const missingRequirements = jobRequirements.filter((jobReq) => !matchedRequirements.includes(jobReq));

      const requirementsScore =
        jobRequirements.length > 0
          ? Math.round((matchedRequirements.length / jobRequirements.length) * 100)
          : 100;

      const keywordsScore =
        jobKeywords.length > 0 ? Math.round((matchedKeywords.length / jobKeywords.length) * 100) : 100;

      const overallScore = Math.round((requirementsScore + keywordsScore) / 2);

      return NextResponse.json({
        feedback: feedbackResponse.choices[0].message.content,
        requirements: {
          matched: matchedRequirements,
          missing: missingRequirements,
          resumeRequirements: resumeRequirements,
          score: requirementsScore // Add this
        },
        atsKeywords: {
          matched: matchedKeywords,
          missing: missingKeywords,
          score: keywordsScore // Add this
        },
        overallScore // Add this
      });
    } catch (error) {
      return NextResponse.json({ error: error }, { status: 503 });
    }
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
