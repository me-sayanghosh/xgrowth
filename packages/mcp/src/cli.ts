#!/usr/bin/env node

import { ContentFormat } from '@xgrowth/shared';
import { LocalXGrowthClient } from './local/local-client.js';

function parseArgs(argv: string[]) {
  const positionals: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]!;
    if (token.startsWith('--')) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        flags[key] = true;
      } else {
        flags[key] = next;
        i++;
      }
    } else {
      positionals.push(token);
    }
  }

  return { positionals, flags };
}

function splitCsv(value: string | boolean | undefined): string[] | undefined {
  if (typeof value !== 'string') return undefined;
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function printHelp(): void {
  console.log(`XGrowth Local CLI (Zero-DB, Buffer-First)

Usage:
  npm run cli -- <command> [options]

Commands:
  status                                       Show local queue & pause status
  channels                                     List connected Buffer X channels & quota
  pause <on|off>                               Toggle global emergency pause
  channel default <channelId>                  Set default Buffer X channel ID
  style                                        Show brand pillars, voice traits & reference accounts
  ref list                                     List reference X accounts
  ref add --handle @name [--notes ...] [--traits "a,b"] [--topics "x,y"] [--sample "post"]
  ref remove <handleOrId>                      Delete a reference X account
  topic list                                   List saved research topics
  topic add --title "..." --url "https://..." [--pillar "..."] [--summary "..."]
  draft list [status]                          List drafts (needs_review, approved, queued, ...)
  draft create --text "..." [--thread "p1||p2"] [--pillar "..."] [--format single_post]
  draft edit <id> [--text "..."] [--pillar "..."]
  draft approve <id> [channelId]               Approve draft and compute SHA-256 hash
  draft reject <id> [reason]                   Reject draft with audit reason
  draft schedule <id> <isoUtc>                 Assign UTC slot to approved draft
  draft submit <id> [channelId] [--mode addToQueue|scheduled|publishNow] [--dueAt <iso>]
  draft reconcile <id>                         Reconcile unknown/submitted draft against Buffer
  calendar [days]                              View upcoming UTC publishing windows
  report                                       Print weekly local Markdown summary
  audit [limit]                                Print recent redacted audit events
`);
}

export async function runCli(argv: string[], client = new LocalXGrowthClient()): Promise<void> {
  const { positionals, flags } = parseArgs(argv);
  const [cmd, sub, arg1, arg2] = positionals;

  if (!cmd || cmd === 'help' || flags.help) {
    printHelp();
    return;
  }

  const out = (data: unknown) => {
    if (typeof data === 'string' && !flags.json) {
      console.log(data);
    } else {
      console.log(JSON.stringify(data, null, 2));
    }
  };

  if (cmd === 'status') {
    out(await client.getStatus());
    return;
  }

  if (cmd === 'channels') {
    out(await client.listChannels());
    return;
  }

  if (cmd === 'pause') {
    if (sub !== 'on' && sub !== 'off') {
      throw new Error('Usage: pause <on|off>');
    }
    out(await client.toggleEmergencyPause(sub === 'on'));
    return;
  }

  if (cmd === 'channel' && sub === 'default') {
    if (!arg1) throw new Error('Usage: channel default <channelId>');
    out(client.workflow.updateSettings({ defaultChannelId: arg1 }, 'cli-owner'));
    return;
  }

  if (cmd === 'style') {
    out(await client.getStyleProfile());
    return;
  }

  if (cmd === 'ref') {
    if (sub === 'list') {
      out(await client.listReferenceAccounts());
      return;
    }
    if (sub === 'add') {
      const handle = typeof flags.handle === 'string' ? flags.handle : arg1;
      if (!handle) throw new Error('Usage: ref add --handle @name');
      out(
        await client.saveReferenceAccount({
          handle,
          notes: typeof flags.notes === 'string' ? flags.notes : undefined,
          styleTraits: splitCsv(flags.traits),
          postArchetypes: splitCsv(flags.archetypes),
          topics: splitCsv(flags.topics),
          samplePosts: typeof flags.sample === 'string' ? [flags.sample] : undefined,
        }),
      );
      return;
    }
    if (sub === 'remove') {
      if (!arg1) throw new Error('Usage: ref remove <handleOrId>');
      out(await client.deleteReferenceAccount(arg1));
      return;
    }
  }

  if (cmd === 'topic') {
    if (sub === 'list') {
      out(await client.getTopics());
      return;
    }
    if (sub === 'add') {
      if (typeof flags.title !== 'string' || typeof flags.url !== 'string') {
        throw new Error('Usage: topic add --title "..." --url "https://..."');
      }
      out(
        await client.addTopic({
          title: flags.title,
          sourceUrl: flags.url,
          summary: typeof flags.summary === 'string' ? flags.summary : undefined,
          topicPillar: typeof flags.pillar === 'string' ? flags.pillar : undefined,
        }),
      );
      return;
    }
  }

  if (cmd === 'draft') {
    if (sub === 'list') {
      out(await client.listDrafts(arg1));
      return;
    }
    if (sub === 'create') {
      const threadParts = typeof flags.thread === 'string' ? flags.thread.split('||').map((p) => p.trim()).filter(Boolean) : undefined;
      const text = typeof flags.text === 'string' ? flags.text : threadParts?.[0];
      if (!text) throw new Error('Usage: draft create --text "..."');
      out(
        await client.createDraft({
          text,
          threadParts,
          format: typeof flags.format === 'string' ? (flags.format as ContentFormat) : undefined,
          topicPillar: typeof flags.pillar === 'string' ? flags.pillar : undefined,
          researchNotes: typeof flags.notes === 'string' ? flags.notes : undefined,
        }),
      );
      return;
    }
    if (sub === 'edit') {
      if (!arg1) throw new Error('Usage: draft edit <id> --text "..."');
      out(
        await client.editDraft(arg1, {
          text: typeof flags.text === 'string' ? flags.text : undefined,
          topicPillar: typeof flags.pillar === 'string' ? flags.pillar : undefined,
        }),
      );
      return;
    }
    if (sub === 'approve') {
      if (!arg1) throw new Error('Usage: draft approve <id> [channelId]');
      out(await client.approveDraft(arg1, arg2));
      return;
    }
    if (sub === 'reject') {
      if (!arg1) throw new Error('Usage: draft reject <id> [reason]');
      out(await client.rejectDraft(arg1, arg2));
      return;
    }
    if (sub === 'schedule') {
      if (!arg1 || !arg2) throw new Error('Usage: draft schedule <id> <isoUtc>');
      out(await client.schedulePost(arg1, arg2));
      return;
    }
    if (sub === 'submit') {
      if (!arg1) throw new Error('Usage: draft submit <id> [channelId]');
      const mode = typeof flags.mode === 'string' ? (flags.mode as 'addToQueue' | 'scheduled' | 'publishNow') : 'addToQueue';
      out(
        await client.submitToBuffer({
          contentItemId: arg1,
          channelId: arg2,
          schedulingType: mode,
          dueAt: typeof flags.dueAt === 'string' ? flags.dueAt : undefined,
        }),
      );
      return;
    }
    if (sub === 'reconcile') {
      if (!arg1) throw new Error('Usage: draft reconcile <id>');
      out(await client.reconcileStatus(arg1));
      return;
    }
  }

  if (cmd === 'calendar') {
    const days = sub ? parseInt(sub, 10) : 7;
    out(await client.getCalendarSlots(Number.isFinite(days) ? days : 7));
    return;
  }

  if (cmd === 'report') {
    const report = await client.getWeeklyReport();
    out(flags.json ? report : report.markdownReport);
    return;
  }

  if (cmd === 'audit') {
    const limit = sub ? parseInt(sub, 10) : 25;
    out(client.store.readAuditEvents(Number.isFinite(limit) ? limit : 25));
    return;
  }

  throw new Error(`Unknown command: ${positionals.join(' ')}. Run with --help for usage.`);
}

if (process.argv[1]?.endsWith('cli.ts') || process.argv[1]?.endsWith('cli.js')) {
  runCli(process.argv.slice(2)).catch((err) => {
    console.error(`[XGrowth CLI Error] ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  });
}
