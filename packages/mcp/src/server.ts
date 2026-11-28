import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { XGrowthApiClient, XGrowthClientLike } from './client.js';

export function createXGrowthMcpServer(client?: XGrowthClientLike): McpServer {
  const apiClient: XGrowthClientLike = client || new XGrowthApiClient();

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
        .enum(['single_post', 'educational_tip', 'build_in_public', 'opinion_with_reasoning', 'thread_draft'])
        .default('single_post')
        .describe('Content format type.'),
      topicPillar: z.string().optional().describe('Target content pillar (e.g. "Software engineering", "TypeScript & Node.js").'),
      language: z.enum(['en', 'bn', 'mixed']).optional().describe('Target content language (en, bn, mixed).'),
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
      channelId: z.string().optional().describe('Target Buffer X channel ID (optional if defaultChannelId is configured).'),
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
      channelId: z.string().optional().describe('Target Buffer X channel ID (optional if bound during approval or defaultChannelId is set).'),
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

  // 10. List Connected Buffer Channels & Quota
  server.tool(
    'xgrowth_list_channels',
    'Discover connected Buffer X (Twitter) channels and check current monthly API request quota.',
    {},
    async () => {
      try {
        const result = await apiClient.listChannels();
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (err: unknown) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to list Buffer channels: ${err instanceof Error ? err.message : String(err)}` }],
        };
      }
    },
  );

  // 11. Run Autonomous Research-to-Draft Pipeline
  server.tool(
    'xgrowth_run_daily_pipeline',
    'Execute the autonomous Twitter agent pipeline: sync RSS feeds, rank top topics, extract briefs, and queue linted drafts for human review.',
    {
      maxTopics: z.number().int().min(1).max(5).default(2).describe('Maximum discovered topics to turn into drafts.'),
      syncFeeds: z.boolean().default(true).describe('Whether to sync active RSS sources first.'),
      format: z
        .enum(['single_post', 'educational_tip', 'build_in_public', 'opinion_with_reasoning', 'thread_draft'])
        .optional()
        .describe('Optional override content format for generated drafts.'),
      variantCount: z.number().int().min(1).max(3).default(2).describe('Draft variants per topic.'),
    },
    async (args) => {
      try {
        const result = await apiClient.runDailyPipeline(args);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (err: unknown) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Daily agent pipeline failed: ${err instanceof Error ? err.message : String(err)}` }],
        };
      }
    },
  );

  // 12. Generate Opening Hooks
  server.tool(
    'xgrowth_generate_hooks',
    'Generate non-clickbait engineering opening hook variants under 140 characters.',
    {
      topic: z.string().min(1).describe('Topic to generate opening hooks for.'),
      pillar: z.string().optional().describe('Target topic pillar.'),
      keyTakeaway: z.string().optional().describe('Core technical takeaway.'),
      language: z.enum(['en', 'bn', 'mixed']).optional().describe('Target language.'),
      count: z.number().int().min(1).max(5).default(4).describe('Number of hooks to generate.'),
    },
    async (args) => {
      try {
        const result = await apiClient.generateHooks(args);
        return {
          content: [{ type: 'text', text: JSON.stringify(result.hooks, null, 2) }],
        };
      } catch (err: unknown) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Hook generation failed: ${err instanceof Error ? err.message : String(err)}` }],
        };
      }
    },
  );

  // 13. Suggest Technical CTAs
  server.tool(
    'xgrowth_suggest_ctas',
    'Suggest authentic, non-manipulative technical discussion CTAs for X posts.',
    {
      topic: z.string().min(1).describe('Topic of the post.'),
      format: z
        .enum(['single_post', 'educational_tip', 'build_in_public', 'opinion_with_reasoning', 'thread_draft'])
        .optional()
        .describe('Content format.'),
      language: z.enum(['en', 'bn', 'mixed']).optional().describe('Target language.'),
      count: z.number().int().min(1).max(5).default(4).describe('Number of CTAs to suggest.'),
    },
    async (args) => {
      try {
        const result = await apiClient.suggestCtas(args);
        return {
          content: [{ type: 'text', text: JSON.stringify(result.ctas, null, 2) }],
        };
      } catch (err: unknown) {
        return {
          isError: true,
          content: [{ type: 'text', text: `CTA suggestion failed: ${err instanceof Error ? err.message : String(err)}` }],
        };
      }
    },
  );

  // 14. Edit Draft
  server.tool(
    'xgrowth_edit_draft',
    'Update a draft text, threadParts, or topicPillar. Automatically invalidates prior approval if modified after approval.',
    {
      contentItemId: z.string().describe('The ID of the draft to edit.'),
      text: z.string().optional().describe('Updated primary text.'),
      threadParts: z.array(z.string()).optional().describe('Updated sequential thread tweets.'),
      topicPillar: z.string().optional().describe('Updated topic pillar.'),
    },
    async ({ contentItemId, ...updates }) => {
      try {
        const item = await apiClient.editDraft(contentItemId, updates);
        return {
          content: [{ type: 'text', text: JSON.stringify(item, null, 2) }],
        };
      } catch (err: unknown) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to edit draft: ${err instanceof Error ? err.message : String(err)}` }],
        };
      }
    },
  );

  // 15. Reject Draft
  server.tool(
    'xgrowth_reject_draft',
    'Reject a draft in review queue with an audit reason.',
    {
      contentItemId: z.string().describe('The ID of the draft to reject.'),
      reason: z.string().optional().describe('Rejection reason for audit log.'),
    },
    async ({ contentItemId, reason }) => {
      try {
        const res = await apiClient.rejectDraft(contentItemId, reason);
        return {
          content: [{ type: 'text', text: `Draft ${contentItemId} marked as '${res.item.status}'.` }],
        };
      } catch (err: unknown) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to reject draft: ${err instanceof Error ? err.message : String(err)}` }],
        };
      }
    },
  );

  // 16. Get Editorial Calendar Slots
  server.tool(
    'xgrowth_get_calendar',
    'View upcoming publishing windows, assigned posts, and daily cap conflicts.',
    {
      days: z.number().int().min(1).max(30).default(7).describe('Number of upcoming days to inspect.'),
    },
    async ({ days }) => {
      try {
        const slots = await apiClient.getCalendarSlots(days);
        return {
          content: [{ type: 'text', text: JSON.stringify(slots, null, 2) }],
        };
      } catch (err: unknown) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to fetch calendar: ${err instanceof Error ? err.message : String(err)}` }],
        };
      }
    },
  );

  // 17. Schedule Approved Post into Calendar Slot
  server.tool(
    'xgrowth_schedule_post',
    'Assign an approved post to a target UTC ISO timestamp slot on the editorial calendar.',
    {
      contentItemId: z.string().describe('The ID of the content item to schedule.'),
      scheduledFor: z.string().describe('ISO 8601 UTC timestamp for target slot (e.g. 2026-11-28T09:00:00.000Z).'),
    },
    async ({ contentItemId, scheduledFor }) => {
      try {
        await apiClient.schedulePost(contentItemId, scheduledFor);
        return {
          content: [{ type: 'text', text: `Scheduled item ${contentItemId} for ${scheduledFor}.` }],
        };
      } catch (err: unknown) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to schedule post: ${err instanceof Error ? err.message : String(err)}` }],
        };
      }
    },
  );

  // 18. Create Draft Directly (Agent-Authored, Zero-Gemini)
  server.tool(
    'xgrowth_create_draft',
    'Save a post or thread authored directly by Antigravity or VS Code Copilot into needs_review after 280-char and tone-lint validation.',
    {
      text: z.string().min(1).describe('Primary post text (or first tweet of a thread).'),
      threadParts: z.array(z.string()).optional().describe('Optional ordered tweets for an X thread.'),
      format: z
        .enum(['single_post', 'educational_tip', 'build_in_public', 'opinion_with_reasoning', 'thread_draft'])
        .optional()
        .describe('Content format.'),
      topicPillar: z.string().optional().describe('Content pillar name.'),
      audience: z.string().optional().describe('Target developer audience.'),
      sourceUrls: z.array(z.string().url()).optional().describe('Supporting reference URLs.'),
      researchNotes: z.string().optional().describe('Angle, style inspiration, or factual notes.'),
      mediaUrls: z.array(z.string().url()).optional().describe('Optional public media URLs.'),
    },
    async (args) => {
      try {
        const created = await apiClient.createDraft(args);
        return {
          content: [{ type: 'text', text: JSON.stringify(created, null, 2) }],
        };
      } catch (err: unknown) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to create draft: ${err instanceof Error ? err.message : String(err)}` }],
        };
      }
    },
  );

  // 19. Save Reference X Account Style Profile
  server.tool(
    'xgrowth_save_reference_account',
    'Save or update a reference X account profile (style traits, post archetypes, sample posts, topics) for original style inspiration.',
    {
      handle: z.string().min(1).describe('X handle such as @handle.'),
      displayName: z.string().optional().describe('Display name of the reference account.'),
      profileUrl: z.string().url().optional().describe('Profile URL.'),
      notes: z.string().optional().describe('What works well about this account style.'),
      styleTraits: z.array(z.string()).optional().describe('Observed writing/formatting traits.'),
      postArchetypes: z.array(z.string()).optional().describe('Post formats/structures they use well.'),
      samplePosts: z.array(z.string()).optional().describe('Pasted example posts for structural reference (never copied verbatim).'),
      topics: z.array(z.string()).optional().describe('Core topics they post about.'),
    },
    async (args) => {
      try {
        const saved = await apiClient.saveReferenceAccount(args);
        return {
          content: [{ type: 'text', text: JSON.stringify(saved, null, 2) }],
        };
      } catch (err: unknown) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to save reference account: ${err instanceof Error ? err.message : String(err)}` }],
        };
      }
    },
  );

  // 20. List Reference Accounts
  server.tool(
    'xgrowth_list_reference_accounts',
    'List saved reference X accounts and their style patterns.',
    {},
    async () => {
      try {
        const refs = await apiClient.listReferenceAccounts();
        return {
          content: [{ type: 'text', text: JSON.stringify(refs, null, 2) }],
        };
      } catch (err: unknown) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to list reference accounts: ${err instanceof Error ? err.message : String(err)}` }],
        };
      }
    },
  );

  // 21. Delete Reference Account
  server.tool(
    'xgrowth_delete_reference_account',
    'Delete a saved reference X account by ID or @handle.',
    {
      idOrHandle: z.string().min(1).describe('Reference ID or @handle to remove.'),
    },
    async ({ idOrHandle }) => {
      try {
        const res = await apiClient.deleteReferenceAccount(idOrHandle);
        return {
          content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
        };
      } catch (err: unknown) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to delete reference account: ${err instanceof Error ? err.message : String(err)}` }],
        };
      }
    },
  );

  // 22. Add Research Topic
  server.tool(
    'xgrowth_add_research_topic',
    'Save a verified technical topic and source URL into the local research backlog.',
    {
      title: z.string().min(1).describe('Topic headline or angle.'),
      sourceUrl: z.string().url().describe('Verified primary source URL.'),
      sourceName: z.string().optional().describe('Source publication or author.'),
      summary: z.string().optional().describe('Key verified facts or takeaway.'),
      topicPillar: z.string().optional().describe('Matching brand pillar.'),
    },
    async (args) => {
      try {
        const topic = await apiClient.addTopic(args);
        return {
          content: [{ type: 'text', text: JSON.stringify(topic, null, 2) }],
        };
      } catch (err: unknown) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to add topic: ${err instanceof Error ? err.message : String(err)}` }],
        };
      }
    },
  );

  // 23. Get Style Profile & Reference Context
  server.tool(
    'xgrowth_get_style_profile',
    'Retrieve configured brand pillars, voice traits, banned buzzwords, and saved reference account styles.',
    {},
    async () => {
      try {
        const profile = await apiClient.getStyleProfile();
        return {
          content: [{ type: 'text', text: JSON.stringify(profile, null, 2) }],
        };
      } catch (err: unknown) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to load style profile: ${err instanceof Error ? err.message : String(err)}` }],
        };
      }
    },
  );

  // ==========================================
  // MCP Resources
  // ==========================================

  // Resource 1: System Status
  server.resource(
    'xgrowth_status',
    'xgrowth://status',
    { mimeType: 'application/json', description: 'Live operational status, pause state, and channel connectivity' },
    async () => {
      const status = await apiClient.getStatus();
      return {
        contents: [
          {
            uri: 'xgrowth://status',
            mimeType: 'application/json',
            text: JSON.stringify(status, null, 2),
          },
        ],
      };
    },
  );

  // Resource 2: Review Queue
  server.resource(
    'xgrowth_review_queue',
    'xgrowth://review-queue',
    { mimeType: 'application/json', description: 'Pending review drafts in the queue' },
    async () => {
      const queue = await apiClient.listDrafts('needs_review');
      return {
        contents: [
          {
            uri: 'xgrowth://review-queue',
            mimeType: 'application/json',
            text: JSON.stringify(queue, null, 2),
          },
        ],
      };
    },
  );

  // Resource 3: Weekly Report
  server.resource(
    'xgrowth_weekly_report',
    'xgrowth://weekly-report',
    { mimeType: 'text/markdown', description: 'Latest weekly content synthesis and week-over-week performance' },
    async () => {
      const report = await apiClient.getWeeklyReport();
      return {
        contents: [
          {
            uri: 'xgrowth://weekly-report',
            mimeType: 'text/markdown',
            text: report.markdownReport || JSON.stringify(report, null, 2),
          },
        ],
      };
    },
  );

  // Resource 4: Style Profile & Reference Accounts
  server.resource(
    'xgrowth_style_profile',
    'xgrowth://style-profile',
    { mimeType: 'application/json', description: 'Brand pillars, voice guidelines, and saved reference X account styles' },
    async () => {
      const profile = await apiClient.getStyleProfile();
      return {
        contents: [
          {
            uri: 'xgrowth://style-profile',
            mimeType: 'application/json',
            text: JSON.stringify(profile, null, 2),
          },
        ],
      };
    },
  );

  // ==========================================
  // MCP Prompts
  // ==========================================

  // Prompt 1: Draft Engineering Post
  server.prompt(
    'draft_engineering_post',
    'Guide the assistant in drafting an authentic, non-clickbait developer post on X.',
    {
      topic: z.string().describe('The core engineering topic or breakthrough to cover'),
      pillar: z.string().optional().describe('Target content pillar (e.g. Distributed Systems, TypeScript)'),
      format: z.string().optional().describe('Content format: single_post, educational_tip, build_in_public, opinion_with_reasoning, or thread_draft'),
    },
    ({ topic, pillar, format }) => {
      return {
        description: `Drafting guide for technical topic: ${topic}`,
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `You are acting as the AI Content Strategist for XGrowth.
Please draft an authentic, developer-oriented post on the topic: "${topic}".
Target Pillar: ${pillar || 'Software Engineering'}
Content Format: ${format || 'single_post'}

Invariants to uphold:
1. Strict 280-character boundary for standalone posts (or structured thread parts).
2. Ground all claims exclusively in verifiable architectural principles or provided facts.
3. Zero clickbait, zero superficial buzzwords (never use "game-changer", "mind-blowing", etc.).
4. Focus on practical developer trade-offs, performance nuances, or production lessons.`,
            },
          },
        ],
      };
    },
  );

  // Prompt 2: Analyze Performance
  server.prompt(
    'analyze_performance',
    'Guide the assistant in analyzing weekly content analytics and recommending next-week experiments.',
    {
      focusPillar: z.string().optional().describe('Specific content pillar to evaluate deeply'),
    },
    ({ focusPillar }) => {
      return {
        description: 'Weekly analytics evaluation and hypothesis design',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Analyze recent content performance${focusPillar ? ` for pillar "${focusPillar}"` : ''} using the xgrowth://weekly-report resource.
Synthesize:
1. Top-performing formats and topics with positive week-over-week deltas.
2. Under-performing topics requiring reframing or code-first examples.
3. Exactly two actionable, testable experiments for the upcoming week.`,
            },
          },
        ],
      };
    },
  );

  return server;
}
