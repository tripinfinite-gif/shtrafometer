import type { ConnectionConfig, Fix, FixPlan } from '@/lib/types';
import { createSSHConnector, type SSHConnector } from './connectors/ssh';
import { createFTPConnector, type FTPConnector } from './connectors/ftp';

// ─── Result types ──────────────────────────────────────────────────

export interface FixExecutionResult {
  fixId: string;
  success: boolean;
  backupPath?: string;
  error?: string;
}

export interface ExecutionReport {
  orderId: string;
  startedAt: string;
  completedAt: string;
  results: FixExecutionResult[];
  totalApplied: number;
  totalFailed: number;
}

// ─── Connector abstraction ─────────────────────────────────────────

type Connector = SSHConnector | FTPConnector;

function createConnector(type: 'ssh' | 'ftp'): Connector {
  return type === 'ssh' ? createSSHConnector() : createFTPConnector();
}

// ─── Insertion helpers ─────────────────────────────────────────────

function insertBeforeTag(html: string, tag: string, code: string): string {
  const idx = html.lastIndexOf(tag);
  if (idx === -1) {
    // Fallback: append at end
    console.warn(`[Executor] Tag "${tag}" not found, appending at end`);
    return html + '\n' + code;
  }
  return html.slice(0, idx) + code + '\n' + html.slice(idx);
}

// ─── Apply a single fix ───────────────────────────────────────────

async function applyFix(
  connector: Connector,
  fix: Fix,
  remotePath: string,
): Promise<FixExecutionResult> {
  const fullPath = remotePath.replace(/\/$/, '') + '/' + fix.targetPath.replace(/^\//, '');

  try {
    // New file — just write it
    if (fix.insertionPoint === 'new-file') {
      await connector.writeFile(fullPath, fix.code);
      fix.status = 'applied';
      fix.appliedAt = new Date().toISOString();
      console.log(`[Executor] Created new file: ${fullPath}`);
      return { fixId: fix.id, success: true };
    }

    // Existing file — backup first, then modify
    const backupPath = await connector.backup(fullPath);
    const content = await connector.readFile(fullPath);

    let updated: string;

    switch (fix.insertionPoint) {
      case 'before-close-body':
        updated = insertBeforeTag(content, '</body>', fix.code);
        break;
      case 'inside-footer':
        updated = insertBeforeTag(content, '</footer>', fix.code);
        break;
      default:
        // Generic: try to find a literal marker
        updated = insertBeforeTag(content, fix.insertionPoint, fix.code);
        break;
    }

    await connector.writeFile(fullPath, updated);

    fix.status = 'applied';
    fix.appliedAt = new Date().toISOString();
    console.log(`[Executor] Applied fix ${fix.id} to ${fullPath}`);

    return { fixId: fix.id, success: true, backupPath };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    fix.status = 'failed';
    fix.error = message;
    console.error(`[Executor] Fix ${fix.id} failed: ${message}`);
    return { fixId: fix.id, success: false, error: message };
  }
}

// ─── Main executor ─────────────────────────────────────────────────

export async function executeFixes(
  plan: FixPlan,
  config: ConnectionConfig,
): Promise<ExecutionReport> {
  const startedAt = new Date().toISOString();
  const results: FixExecutionResult[] = [];
  const connector = createConnector(config.type);

  try {
    await connector.connect(config);

    for (const fix of plan.fixes) {
      if (fix.status === 'skipped') {
        results.push({ fixId: fix.id, success: false, error: 'Skipped' });
        continue;
      }
      const result = await applyFix(connector, fix, config.remotePath);
      results.push(result);
    }
  } catch (err) {
    // Connection-level failure — mark all remaining fixes as failed
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Executor] Connection error: ${message}`);

    for (const fix of plan.fixes) {
      if (!results.some((r) => r.fixId === fix.id)) {
        fix.status = 'failed';
        fix.error = message;
        results.push({ fixId: fix.id, success: false, error: message });
      }
    }
  } finally {
    await connector.disconnect();
  }

  const completedAt = new Date().toISOString();
  const totalApplied = results.filter((r) => r.success).length;
  const totalFailed = results.filter((r) => !r.success).length;

  const report: ExecutionReport = {
    orderId: plan.orderId,
    startedAt,
    completedAt,
    results,
    totalApplied,
    totalFailed,
  };

  console.log(
    `[Executor] Done: ${totalApplied} applied, ${totalFailed} failed`,
  );

  return report;
}

// ─── Connection tester ─────────────────────────────────────────────

export async function testConnection(
  config: ConnectionConfig,
): Promise<{ success: boolean; error?: string }> {
  const connector = createConnector(config.type);

  try {
    await connector.connect(config);
    await connector.listFiles(config.remotePath);
    await connector.disconnect();
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    try {
      await connector.disconnect();
    } catch {
      // ignore disconnect errors
    }
    return { success: false, error: message };
  }
}
