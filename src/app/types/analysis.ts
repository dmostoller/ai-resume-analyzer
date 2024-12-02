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
  requirements: Requirements;
  atsKeywords: ATSKeywords;
  overallScore: number;
}
