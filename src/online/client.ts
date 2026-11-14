import type { Design } from '../game/spacecraft';
import type { WeeklyResult } from '../game/weekly';
import { type Account, type Leader, type Metric, formatCode, normalizeCode, readFreePlaySave } from './model';
import { type SaveData, type SaveStorage } from '../save/save';
import { withoutPlayerNames } from '../game/team';

// Public project address; private database credentials exist only inside the Supabase function.
export const ONLINE_URL = 'https://oyslhxxgxtqhgpfivwcb.supabase.co/functions/v1/leap-online';
export const ACCOUNT_KEY = 'leap.online';
export type OnlineProblem = 'name' | 'code' | 'network' | 'invalidSave' | 'conflict' | 'storage' | 'weekly' | 'expired';
export class OnlineError extends Error {
  constructor(readonly problem: OnlineProblem) { super(problem); }
}

/** One anonymous account per browser, separate from the Company and Demo Mode saves. */
export class OnlineClient {
  code: string | null = null;
  account: Account | null = null;
  constructor(private storage: SaveStorage, private send: typeof fetch = (input, init) => fetch(input, init)) {
    try {
      const saved = JSON.parse(storage.getItem(ACCOUNT_KEY) ?? 'null');
      this.code = typeof saved?.code === 'string' ? normalizeCode(saved.code) : null;
    } catch { /* A missing or damaged account never stops local play. */ }
  }

  private async request<T>(body: object): Promise<T> {
    try {
      const response = await this.send(ONLINE_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body), signal: AbortSignal.timeout(15_000),
      });
      const data = await response.json();
      if (!response.ok) {
        const known: OnlineProblem[] = ['name', 'code', 'invalidSave', 'conflict', 'weekly', 'expired'];
        throw new OnlineError(known.includes(data.error) ? data.error : 'network');
      }
      return data as T;
    } catch (error) {
      throw error instanceof OnlineError ? error : new OnlineError('network');
    }
  }

  private remember(code: string, account: Account): void {
    try { this.storage.setItem(ACCOUNT_KEY, JSON.stringify({ code: formatCode(code) })); }
    catch { throw new OnlineError('storage'); }
    this.code = code;
    this.account = account;
  }

  async create(nickname: string): Promise<void> {
    const result = await this.request<Account & { code: string }>({ action: 'create', nickname });
    const code = normalizeCode(result.code);
    if (!code) throw new OnlineError('network');
    this.remember(code, result);
  }

  async recover(raw: string): Promise<void> {
    const code = normalizeCode(raw);
    if (!code) throw new OnlineError('code');
    const account = await this.request<Account>({ action: 'account', code });
    // Failed recovery leaves the existing account and Company alone.
    this.remember(code, account);
  }

  async refresh(): Promise<void> {
    if (this.code) this.account = await this.request<Account>({ action: 'account', code: this.code });
  }

  async rename(nickname: string): Promise<void> {
    this.account = await this.request<Account>({ action: 'rename', code: this.code, nickname });
  }

  async save(game: SaveData): Promise<void> {
    if (!readFreePlaySave(game)) throw new OnlineError('invalidSave');
    // Team Mode's player names never leave the computer.
    const save: SaveData = { ...game, state: withoutPlayerNames(game.state) };
    this.account = await this.request<Account>({ action: 'save', code: this.code, revision: this.account?.revision, save });
  }

  async load(): Promise<SaveData> {
    const result = await this.request<Account & { save: unknown }>({ action: 'load', code: this.code });
    const game = readFreePlaySave(result.save);
    if (!game) throw new OnlineError('invalidSave');
    this.account = result;
    return game;
  }

  async weekly(): Promise<WeeklyBoard> {
    return this.request<WeeklyBoard>({ action: 'weekly', code: this.code });
  }

  async attempt(week: string, design: Design): Promise<WeeklyResult> {
    const result = await this.request<{ result: WeeklyResult }>({ action: 'weeklySubmit', code: this.code, week, design });
    return result.result;
  }

  async leaders(metric: Metric): Promise<Leader[]> {
    const result = await this.request<{ leaders: Leader[] }>({ action: 'leaderboard', metric });
    return result.leaders;
  }
}

export interface WeeklyLeader { nickname: string; score: number; }
export interface WeeklyBoard {
  week: string;
  leaders: WeeklyLeader[];
  previous: { week: string; leaders: WeeklyLeader[] };
  earned: { week: string; score: number; rank: number | null }[];
}
