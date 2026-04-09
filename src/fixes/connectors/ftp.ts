import { Client } from 'basic-ftp';
import { Readable, Writable } from 'node:stream';
import type { ConnectionConfig } from '@/lib/types';

export interface FTPConnector {
  connect(config: ConnectionConfig): Promise<void>;
  disconnect(): Promise<void>;
  readFile(remotePath: string): Promise<string>;
  writeFile(remotePath: string, content: string): Promise<void>;
  fileExists(remotePath: string): Promise<boolean>;
  backup(remotePath: string): Promise<string>;
  listFiles(dir: string): Promise<string[]>;
}

const CONNECT_TIMEOUT = 10_000;
const OPERATION_TIMEOUT = 30_000;

export function createFTPConnector(): FTPConnector {
  let client: Client | null = null;

  function requireClient(): Client {
    if (!client) throw new Error('FTP connector is not connected');
    return client;
  }

  return {
    async connect(config: ConnectionConfig): Promise<void> {
      const ftp = new Client(OPERATION_TIMEOUT);
      ftp.ftp.verbose = false;

      try {
        // Try FTPS first, fall back to plain FTP
        try {
          await ftp.access({
            host: config.host,
            port: config.port,
            user: config.username,
            password: config.credential,
            secure: true,
            secureOptions: { rejectUnauthorized: false },
          });
        } catch {
          console.log('[FTP] FTPS failed, falling back to plain FTP');
          await ftp.access({
            host: config.host,
            port: config.port,
            user: config.username,
            password: config.credential,
            secure: false,
          });
        }

        client = ftp;
        console.log(`[FTP] Connected to ${config.host}:${config.port}`);
      } catch (err) {
        ftp.close();
        throw err;
      }
    },

    async disconnect(): Promise<void> {
      if (client) {
        client.close();
        client = null;
        console.log('[FTP] Disconnected');
      }
    },

    async readFile(remotePath: string): Promise<string> {
      const ftp = requireClient();
      const chunks: Buffer[] = [];

      const writable = new Writable({
        write(chunk, _encoding, callback) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          callback();
        },
      });

      await ftp.downloadTo(writable, remotePath);
      return Buffer.concat(chunks).toString('utf-8');
    },

    async writeFile(remotePath: string, content: string): Promise<void> {
      const ftp = requireClient();
      const readable = Readable.from(Buffer.from(content, 'utf-8'));
      await ftp.uploadFrom(readable, remotePath);
      console.log(`[FTP] Wrote ${remotePath}`);
    },

    async fileExists(remotePath: string): Promise<boolean> {
      const ftp = requireClient();
      try {
        await ftp.size(remotePath);
        return true;
      } catch {
        return false;
      }
    },

    async backup(remotePath: string): Promise<string> {
      const timestamp = Date.now();
      const backupPath = `${remotePath}.bak.${timestamp}`;

      const content = await this.readFile(remotePath);
      await this.writeFile(backupPath, content);

      console.log(`[FTP] Backed up ${remotePath} -> ${backupPath}`);
      return backupPath;
    },

    async listFiles(dir: string): Promise<string[]> {
      const ftp = requireClient();
      const list = await ftp.list(dir);
      return list.map((entry) => entry.name);
    },
  };
}
