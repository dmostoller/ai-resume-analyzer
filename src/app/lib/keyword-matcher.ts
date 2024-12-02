// lib/keyword-matcher.ts

import Fuse from 'fuse.js';

interface MatchOptions {
  threshold?: number;
  includeAcronyms?: boolean;
}

export class KeywordMatcher {
  private static readonly DEFAULT_OPTIONS: MatchOptions = {
    threshold: 0.3,
    includeAcronyms: true
  };

  // Normalize text for comparison
  private static normalize(text: string): string {
    return text
      .toLowerCase()
      .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  // Split text into keywords
  private static extractKeywords(text: string): string[] {
    return this.normalize(text).split(' ');
  }

  // Generate acronym variations
  private static getAcronymVariations(text: string): string[] {
    const words = text.split(' ');
    if (words.length <= 1) return [];

    const acronym = words.map((word) => word[0]).join('');
    return [acronym.toLowerCase(), acronym.toUpperCase()];
  }

  // Main matching function
  static match(
    sourceTexts: string[],
    targetTexts: string[],
    options: MatchOptions = {}
  ): {
    matched: string[];
    missing: string[];
    score: number;
  } {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };

    // Extract keywords from source texts
    const sourceKeywords = new Set<string>();
    sourceTexts.forEach((text) => {
      this.extractKeywords(text).forEach((kw) => sourceKeywords.add(kw));
    });

    const matched: string[] = [];
    const missing: string[] = [];

    // Check each target requirement
    targetTexts.forEach((targetText, index) => {
      const targetKeywords = this.extractKeywords(targetText);

      // Check for any common keywords
      const hasMatch = targetKeywords.some((kw) => sourceKeywords.has(kw));
      if (hasMatch) {
        matched.push(targetTexts[index]);
        return;
      }

      // Acronym check
      if (opts.includeAcronyms) {
        const acronyms = this.getAcronymVariations(targetText);
        if (acronyms.some((acr) => sourceKeywords.has(acr))) {
          matched.push(targetTexts[index]);
          return;
        }
      }

      // Fuzzy match check using Fuse.js
      const sourceKeywordsArray = Array.from(sourceKeywords);
      const fuse = new Fuse(sourceKeywordsArray, {
        threshold: opts.threshold,
        includeScore: true
      });

      const searchResults = targetKeywords.map((kw) => fuse.search(kw)[0]);
      const hasFuzzyMatch = searchResults.some((result) => result && result.score! < opts.threshold);

      if (hasFuzzyMatch) {
        matched.push(targetTexts[index]);
      } else {
        missing.push(targetTexts[index]);
      }
    });

    const score = (matched.length / targetTexts.length) * 100;

    return {
      matched,
      missing,
      score: Math.round(score)
    };
  }
}
