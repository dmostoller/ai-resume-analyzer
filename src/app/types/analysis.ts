// app/types/analysis.ts
export interface Requirements {
  matched: string[];
  missing: string[];
  resumeRequirements: string[];
  score: number;
}

export interface ATSKeywords {
  matched: string[];
  missing: string[];
  score: number;
}

export interface AnalysisResponse {
  feedback: string;
  requirements: {
    matched: string[];
    missing: string[];
    resumeRequirements: string[];
    score: number;
  };
  atsKeywords: {
    matched: string[];
    missing: string[];
    score: number;
  };
  overallScore: number;
  jobDescription?: string;
  fileName?: string;
  createdAt?: Date;
}

export interface ScanData {
  feedback: string;
  requirements: {
    matched: string[];
    missing: string[];
    resumeRequirements: string[];
    score: number;
  };
  atsKeywords: {
    matched: string[];
    missing: string[];
    score: number;
  };
  overallScore: number;
  jobDescription?: string;
  fileName?: string;
  createdAt?: string;
}
