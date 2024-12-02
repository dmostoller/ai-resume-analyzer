// app/api/analyze/route.ts

import { NextRequest, NextResponse } from 'next/server';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import OpenAI from 'openai';
import { getServerSession } from 'next-auth/next';
import { rateLimit } from '../../lib/rate-limit';
import NodeCache from 'node-cache';
import { KeywordMatcher } from '../../lib/keyword-matcher';
import { AnalysisResponse } from '@/app/types/analysis';

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

const cache = new NodeCache({ stdTTL: 3600 }); // 1 hour

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

    // Create a unique cache key based on resume and job description
    const cacheKey = `${resumeText}-${jobDescription}`;
    const cachedResponse = cache.get<AnalysisResponse>(cacheKey);

    if (cachedResponse) {
      return NextResponse.json(cachedResponse);
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
          max_tokens: 500,
          temperature: 0
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
          max_tokens: 100,
          temperature: 0
        }),
        openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'user',
              content: `Extract important ATS keywords from this job description, focusing on skills, technologies, qualifications, and certifications. Format as a comma-separated list:\n${jobDescription || 'No job description provided.'}`
            }
          ],
          max_tokens: 100,
          temperature: 0
        }),
        openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'user',
              content: `Extract all skills, technologies, qualifications, and certifications from this resume as a comma-separated list:\n${resumeText}`
            }
          ],
          max_tokens: 100,
          temperature: 0.3
        }),
        openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'user',
              content: `Extract key qualifications and requirements from this resume as a numbered list:\n${resumeText}`
            }
          ],
          max_tokens: 100,
          temperature: 0
        })
      ]);
      const resumeKeywordsContent = resumeKeywordsResponse.choices[0]?.message?.content || '';
      const resumeKeywords = resumeKeywordsContent.split(',').map((k) => k.trim());
      const atsKeywordsContent = atsKeywordsResponse.choices[0]?.message?.content || '';
      const jobKeywords = atsKeywordsContent.split(',').map((k) => k.trim());

      const jobRequirementsContent = jobRequirementsResponse.choices[0]?.message?.content || '';
      const resumeRequirementsContent = resumeRequirementsResponse.choices[0]?.message?.content || '';

      const jobRequirements = jobRequirementsContent
        .split(/\d+\.\s+/)
        .filter(Boolean)
        .map((req) => req.trim());

      const resumeRequirements = resumeRequirementsContent
        .split(/\d+\.\s+/)
        .filter(Boolean)
        .map((req) => req.trim());

      // Use new KeywordMatcher
      const keywordAnalysis = KeywordMatcher.match(resumeKeywords, jobKeywords);
      const requirementAnalysis = KeywordMatcher.match(resumeRequirements, jobRequirements, {
        threshold: 0
      });

      const responseData = {
        feedback: feedbackResponse.choices[0].message.content,
        requirements: {
          matched: requirementAnalysis.matched,
          missing: requirementAnalysis.missing,
          resumeRequirements: resumeRequirements,
          score: requirementAnalysis.score
        },
        atsKeywords: {
          matched: keywordAnalysis.matched,
          missing: keywordAnalysis.missing,
          score: keywordAnalysis.score
        },
        overallScore: Math.round((requirementAnalysis.score + keywordAnalysis.score) / 2)
      };

      // Cache the response
      cache.set(cacheKey, responseData);

      return NextResponse.json(responseData);
    } catch (error) {
      return NextResponse.json({ error: error }, { status: 503 });
    }
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
