import { ResearchBrief } from '@xgrowth/shared';
import crypto from 'crypto';

export interface ExtractBriefInput {
  title: string;
  sourceUrl: string;
  excerpt: string;
  topicPillar: string;
  freshness: number;
  credibility: number;
  publishedAt?: string;
}

export class BriefExtractorService {
  public static extractBrief(input: ExtractBriefInput): ResearchBrief {
    // Separate factual statements from editorial opinions
    const sentences = input.excerpt
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 10);

    const verifiedFacts: string[] = [];
    const uncertainties: string[] = [];

    const opinionMarkers = ['think', 'believe', 'maybe', 'possibly', 'could', 'opinion', 'prediction', 'speculate'];

    for (const sentence of sentences) {
      const isOpinion = opinionMarkers.some((m) => sentence.toLowerCase().includes(m));
      if (isOpinion) {
        uncertainties.push(sentence);
      } else {
        verifiedFacts.push(sentence);
      }
    }

    if (verifiedFacts.length === 0) {
      verifiedFacts.push(`Reported development: ${input.title}`);
    }

    return {
      id: `brief-${crypto.randomUUID()}`,
      topic: input.title,
      topicPillar: input.topicPillar,
      whyItMatters: `High developer relevance in ${input.topicPillar} with freshness score ${input.freshness}/5.`,
      primarySourceUrl: input.sourceUrl,
      additionalSources: [],
      publishedAt: input.publishedAt,
      retrievedAt: new Date().toISOString(),
      verifiedFacts,
      uncertainties,
      suggestedAngle: `Practical engineering takeaways and lessons learned from ${input.title}.`,
      suggestedFormat: 'educational_tip',
      audienceRelevance: 4,
      freshness: input.freshness,
      credibility: input.credibility,
      decision: 'draft',
      createdAt: new Date().toISOString(),
    };
  }
}
