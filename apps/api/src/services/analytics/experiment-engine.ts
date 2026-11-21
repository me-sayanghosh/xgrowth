import { PillarAggregate } from './aggregator.js';

export class ExperimentEngine {
  public static recommendExperiments(
    allPillars: string[],
    recentAggregates: PillarAggregate[],
  ): string[] {
    const testedPillars = new Set(recentAggregates.map((a) => a.pillar));
    const undertested = allPillars.filter((p) => !testedPillars.has(p));

    const recommendations: string[] = [];

    if (undertested.length > 0) {
      recommendations.push(
        `Expand coverage in undertested pillar: "${undertested[0]}". Propose 2 educational drafts.`,
      );
    }

    recommendations.push(
      'Test a "Build in Public" post detailing a real architectural refactor or debugging war story.',
    );

    recommendations.push(
      'Evaluate shorter single-post hooks (under 160 characters) vs detailed 280-character explanations.',
    );

    return recommendations.slice(0, 3);
  }
}
