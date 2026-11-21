import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { XGrowthApiClient } from './client.js';

export function createXGrowthMcpServer(client?: XGrowthApiClient): McpServer {
  const apiClient = client || new XGrowthApiClient();

  const server = new McpServer({
    name: 'xgrowth-mcp',
    version: '0.1.0',
  });

  // 1. Get System Status
  server.tool(
    'xgrowth_get_status',
    'Inspect the operational status of XGrowth AI including emergency pause state, brand pillars, review queue count, and publishing health.',
    {},
    async () => {
      try {
        const status = await apiClient.getStatus();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(status, null, 2),
            },
          ],
        };
      } catch (err: unknown) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to fetch status: ${err instanceof Error ? err.message : String(err)}` }],
        };
      }
    },
  );

  // 2. Toggle Emergency Pause
  server.tool(
    'xgrowth_toggle_emergency_pause',
    'Toggle the global emergency pause on or off. When paused, all outbound Buffer submissions are halted.',
    {
      paused: z.boolean().describe('True to pause all outbound publishing, false to resume live queueing.'),
    },
    async ({ paused }) => {
      try {
        const result = await apiClient.toggleEmergencyPause(paused);
        return {
          content: [
            {
              type: 'text',
              text: `Global Emergency Pause is now ${result.globalPause ? 'ACTIVE (Submissions Blocked)' : 'DISABLED (Live Publishing Resumed)'}.`,
            },
          ],
        };
      } catch (err: unknown) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to toggle pause: ${err instanceof Error ? err.message : String(err)}` }],
        };
      }
    },
  );

  // 3. Research Topics
  server.tool(
    'xgrowth_research_topics',
    'Fetch candidate technical topics and RSS articles discovered by the research desk.',
    {},
    async () => {
      try {
        const topics = await apiClient.getTopics();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(topics, null, 2),
            },
          ],
        };
      } catch (err: unknown) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to fetch topics: ${err instanceof Error ? err.message : String(err)}` }],
        };
      }
    },
  );

  // 4. Generate Draft
  server.tool(
    'xgrowth_generate_draft',
    'Generate technical draft variants for X (Twitter) using Gemini, strictly adhering to brand voice and 280-character constraints.',
    {
      topic: z.string().describe('The primary subject or headline to write about.'),
      verifiedFacts: z.array(z.string()).min(1).describe('List of verified technical facts, quotes, or findings.'),
      format: z
        .enum(['single_post', 'short_educational', 'practical_tip', 'build_in_public', 'opinion_with_reasoning', 'thread'])
        .default('single_post')
        .describe('Content format type.'),
      topicPillar: z.string().optional().describe('Target content pillar (e.g. "Software engineering", "TypeScript & Node.js").'),
      variantCount: z.number().int().min(1).max(3).default(2).describe('Number of variants to generate.'),
    },
    async (args) => {
      try {
        const result = await apiClient.generateDrafts(args);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result.items, null, 2),
            },
          ],
        };
      } catch (err: unknown) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Draft generation failed: ${err instanceof Error ? err.message : String(err)}` }],
        };
      }
    },
  );

  // 5. List Drafts
  server.tool(
    'xgrowth_list_drafts',
    'List content drafts filtered by status: needs_review, approved, queued, submitted_to_buffer, published, or unknown.',
    {
      status: z
        .enum(['needs_review', 'approved', 'queued', 'submitted_to_buffer', 'published', 'unknown'])
        .optional()
        .describe('Filter by draft status. Defaults to returning all items.'),
    },
    async ({ status }) => {
      try {
        const items = await apiClient.listDrafts(status);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(items, null, 2),
            },
          ],
        };
      } catch (err: unknown) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to list drafts: ${err instanceof Error ? err.message : String(err)}` }],
        };
      }
    },
  );

  // 6. Approve Draft
  server.tool(
    'xgrowth_approve_draft',
    'Formally approve a draft for publishing. Computes a canonical cryptographic SHA-256 hash and records an immutable approval record.',
    {
      contentItemId: z.string().describe('The ID of the draft to approve.'),
      channelId: z.string().describe('Target Buffer X channel ID for publication.'),
    },
    async ({ contentItemId, channelId }) => {
      try {
        const result = await apiClient.approveDraft(contentItemId, channelId);
        return {
          content: [
            {
              type: 'text',
              text: `Draft ${contentItemId} successfully approved with hash ${result.item.approval?.approvedHash}. Status is now 'approved'.`,
            },
          ],
        };
      } catch (err: unknown) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Approval failed: ${err instanceof Error ? err.message : String(err)}` }],
        };
      }
    },
  );

  // 7. Submit to Buffer
  server.tool(
    'xgrowth_submit_to_buffer',
    'Submit an approved post to Buffer for scheduling/queueing. Evaluates all 4 gates (pause, approved status, canonical hash, idempotency).',
    {
      contentItemId: z.string().describe('The ID of the approved draft to publish.'),
      channelId: z.string().describe('Target Buffer X channel ID.'),
      schedulingType: z.enum(['addToQueue', 'scheduled', 'publishNow']).default('addToQueue').describe('Buffer queue type.'),
      dueAt: z.string().optional().describe('ISO timestamp for scheduled queueing.'),
    },
    async (args) => {
      try {
        const result = await apiClient.submitToBuffer(args);
        return {
          content: [
            {
              type: 'text',
              text: `Successfully submitted to Buffer. Status: ${result.status}, Submission ID: ${result.submissionId}`,
            },
          ],
        };
      } catch (err: unknown) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Buffer submission rejected: ${err instanceof Error ? err.message : String(err)}` }],
        };
      }
    },
  );

  // 8. Reconcile Status
  server.tool(
    'xgrowth_reconcile_status',
    "Reconcile an ambiguous post in 'unknown' state with Buffer queue history without duplicate retry.",
    {
      contentItemId: z.string().describe('The ID of the draft to reconcile.'),
    },
    async ({ contentItemId }) => {
      try {
        const result = await apiClient.reconcileStatus(contentItemId);
        return {
          content: [
            {
              type: 'text',
              text: `Reconciliation complete. Status safely updated to '${result.item.status}'. Provider Status: '${result.item.buffer?.providerStatus}'.`,
            },
          ],
        };
      } catch (err: unknown) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Reconciliation failed: ${err instanceof Error ? err.message : String(err)}` }],
        };
      }
    },
  );

  // 9. Get Weekly Report
  server.tool(
    'xgrowth_get_weekly_report',
    'Retrieve the latest weekly analytics synthesis and Markdown executive report.',
    {},
    async () => {
      try {
        const report = await apiClient.getWeeklyReport();
        return {
          content: [
            {
              type: 'text',
              text: report.markdownReport,
            },
          ],
        };
      } catch (err: unknown) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to retrieve weekly report: ${err instanceof Error ? err.message : String(err)}` }],
        };
      }
    },
  );

  return server;
}
