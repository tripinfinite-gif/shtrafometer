import { Client, type ConnectConfig, type SFTPWrapper } from 'ssh2';
import type { ConnectionConfig } from '@/lib/types';

export interface SSHConnector {
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

export function createSSHConnector(): SSHConnector {
  let client: Client | null = null;
  let sftp: SFTPWrapper | null = null;

  function requireSftp(): SFTPWrapper {
    if (!sftp) throw new Error('SSH connector is not connected');
    return sftp;
  }

  return {
    async connect(config: ConnectionConfig): Promise<void> {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error('SSH connect timed out'));
          conn.end();
        }, CONNECT_TIMEOUT);

        const conn = new Client();

        const isPrivateKey = config.credential.trimStart().startsWith('-----');
        const connectConfig: ConnectConfig = {
          host: config.host,
          port: config.port,
          username: config.username,
          readyTimeout: CONNECT_TIMEOUT,
          ...(isPrivateKey
            ? { privateKey: config.credential }
            : { password: config.credential }),
        };

        conn.on('ready', () => {
          conn.sftp((err, sftpSession) => {
            clearTimeout(timer);
            if (err) {
              conn.end();
              reject(err);
              return;
            }
            client = conn;
            sftp = sftpSession;
            console.log(`[SSH] Connected to ${config.host}:${config.port}`);
            resolve();
          });
        });

        conn.on('error', (err) => {
          clearTimeout(timer);
          reject(err);
        });

        conn.connect(connectConfig);
      });
    },

    async disconnect(): Promise<void> {
      if (client) {
        client.end();
        client = null;
        sftp = null;
        console.log('[SSH] Disconnected');
      }
    },

    async readFile(remotePath: string): Promise<string> {
      const s = requireSftp();
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error(`SSH readFile timed out: ${remotePath}`));
        }, OPERATION_TIMEOUT);

        const chunks: Buffer[] = [];
        const stream = s.createReadStream(remotePath);

        stream.on('data', (chunk: Buffer) => chunks.push(chunk));
        stream.on('end', () => {
          clearTimeout(timer);
          resolve(Buffer.concat(chunks).toString('utf-8'));
        });
        stream.on('error', (err: Error) => {
          clearTimeout(timer);
          reject(err);
        });
      });
    },

    async writeFile(remotePath: string, content: string): Promise<void> {
      const s = requireSftp();
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error(`SSH writeFile timed out: ${remotePath}`));
        }, OPERATION_TIMEOUT);

        const stream = s.createWriteStream(remotePath);

        stream.on('close', () => {
          clearTimeout(timer);
          console.log(`[SSH] Wrote ${remotePath}`);
          resolve();
        });
        stream.on('error', (err: Error) => {
          clearTimeout(timer);
          reject(err);
        });

        stream.end(Buffer.from(content, 'utf-8'));
      });
    },

    async fileExists(remotePath: string): Promise<boolean> {
      const s = requireSftp();
      return new Promise((resolve) => {
        const timer = setTimeout(() => resolve(false), OPERATION_TIMEOUT);
        s.stat(remotePath, (err) => {
          clearTimeout(timer);
          resolve(!err);
        });
      });
    },

    async backup(remotePath: string): Promise<string> {
      const s = requireSftp();
      const timestamp = Date.now();
      const backupPath = `${remotePath}.bak.${timestamp}`;

      // Read original, then write to backup path
      const content = await this.readFile(remotePath);
      await this.writeFile(backupPath, content);

      console.log(`[SSH] Backed up ${remotePath} -> ${backupPath}`);
      return backupPath;
    },

    async listFiles(dir: string): Promise<string[]> {
      const s = requireSftp();
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error(`SSH listFiles timed out: ${dir}`));
        }, OPERATION_TIMEOUT);

        s.readdir(dir, (err, list) => {
          clearTimeout(timer);
          if (err) {
            reject(err);
            return;
          }
          resolve(list.map((entry) => entry.filename));
        });
      });
    },
  };
}
