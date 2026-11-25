import { WeeklyReportGenerator } from '../../analytics/weekly-reporter.js';

export async function runWeeklyReportTask(): Promise<string> {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const report = await WeeklyReportGenerator.generateReport(oneWeekAgo, now);

  return `Weekly report ${report.id} generated. Analyzed ${report.totalPublished} posts in the last 7 days.`;
}
