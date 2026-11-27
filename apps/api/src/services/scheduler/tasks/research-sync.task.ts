import { ResearchSourceModel } from '../../../db/models/research-source.model.js';
import { ResearchSourceController } from '../../../controllers/research-source.controller.js';
import { SettingsService } from '../../settings.service.js';

export async function runResearchSyncTask(): Promise<string> {
  const sources = await ResearchSourceModel.find({ enabled: true });
  if (sources.length === 0) {
    return 'No active research sources configured.';
  }

  const settings = await SettingsService.getSettings();
  let discoveredCount = 0;

  for (const source of sources) {
    if (source.type !== 'rss') continue;

    try {
      discoveredCount += await ResearchSourceController.syncSourceDocument(
        source,
        settings.brandPillars,
      );
    } catch {
      // Continue next source
    }
  }

  return `Research sync finished. Ingested ${discoveredCount} new candidate topics.`;
}
