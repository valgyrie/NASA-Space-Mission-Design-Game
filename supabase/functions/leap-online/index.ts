import { checkCompanyName } from '../../../src/company/companyName';
import { leaderboardScores, METRICS, normalizeCode, formatCode, readFreePlaySave } from '../../../src/online/model';

declare const Deno: { env: { get(name: string): string | undefined }; serve(handler: (request: Request) => Promise<Response>): void };

const headers = {
  'Content-Type': 'application/json', 'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (body: object, status = 200) => new Response(JSON.stringify(body), { status, headers });
const summary = (row: Record<string, unknown>) => ({ nickname: row.nickname, revision: row.revision, updatedAt: row.updated_at });

/** Recovery codes authenticate private operations here; the public key never grants table access. */
Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'POST') return reply({ error: 'request' }, 405);
  try {
    // Read at most 1 MiB, including streamed bodies without Content-Length.
    const reader = request.body?.getReader();
    if (!reader) return reply({ error: 'request' }, 400);
    let text = '';
    let bytes = 0;
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 1_048_576) { await reader.cancel(); return reply({ error: 'invalidSave' }, 413); }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    let body;
    try { body = JSON.parse(text); } catch { return reply({ error: 'request' }, 400); }
    if (!body || typeof body !== 'object') return reply({ error: 'request' }, 400);

    const db = async (query: string, method = 'GET', data?: object) => {
      const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const result = await fetch(`${Deno.env.get('SUPABASE_URL')}/rest/v1/leap_players?${query}`, {
        method, headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: data === undefined ? undefined : JSON.stringify(data),
      });
      if (!result.ok) throw new Error('database');
      return await result.json() as Record<string, unknown>[];
    };

    if (body.action === 'leaderboard') {
      if (!METRICS.includes(body.metric)) return reply({ error: 'request' }, 400);
      const leaders = await db(`select=nickname,value,missions,reputation,research&save=not.is.null&order=${body.metric}.desc,id.asc&limit=20`);
      return reply({ leaders });
    }
    const nickname = body.action === 'create' || body.action === 'rename'
      ? typeof body.nickname === 'string' && checkCompanyName(body.nickname) : null;
    if ((body.action === 'create' || body.action === 'rename') && (!nickname || !nickname.ok)) return reply({ error: 'name' }, 400);

    const code = body.action === 'create'
      ? Array.from(crypto.getRandomValues(new Uint8Array(20)), (n) => n.toString(16).padStart(2, '0')).join('').toUpperCase()
      : typeof body.code === 'string' && normalizeCode(body.code);
    if (!code) return reply({ error: 'code' }, 401);
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code))), (n) => n.toString(16).padStart(2, '0')).join('');
    if (body.action === 'create' && nickname && nickname.ok) {
      const [row] = await db('', 'POST', { recovery_hash: hash, nickname: nickname.name });
      return reply({ ...summary(row!), code: formatCode(code) });
    }
    const filter = `recovery_hash=eq.${hash}`;
    const [player] = await db(`${filter}&select=nickname,revision,updated_at`);
    if (!player) return reply({ error: 'code' }, 401);
    if (body.action === 'account') return reply(summary(player));
    if (body.action === 'rename' && nickname && nickname.ok) {
      const [row] = await db(filter, 'PATCH', { nickname: nickname.name });
      return reply(summary(row!));
    }
    if (body.action === 'load') {
      const [row] = await db(`${filter}&select=nickname,revision,updated_at,save`);
      return reply({ ...summary(row!), save: row!.save });
    }
    if (body.action === 'save') {
      const game = readFreePlaySave(body.save);
      if (!game) return reply({ error: 'invalidSave' }, 400);
      const scores = leaderboardScores(game.state);
      if (Object.values(scores).some((n) => !Number.isFinite(n) || n < 0 || n > 1e15)) return reply({ error: 'invalidSave' }, 400);
      if (!Number.isSafeInteger(body.revision) || body.revision !== player.revision) return reply({ error: 'conflict' }, 409);
      // Compare-and-swap keeps simultaneous saves from silently overwriting one another.
      const [row] = await db(`${filter}&revision=eq.${body.revision}`, 'PATCH', {
        save: game, ...scores, revision: body.revision + 1, updated_at: new Date().toISOString(),
      });
      return row ? reply(summary(row)) : reply({ error: 'conflict' }, 409);
    }
    return reply({ error: 'request' }, 400);
  } catch {
    // Never echo database errors, request bodies or recovery codes to logs or responses.
    return reply({ error: 'network' }, 503);
  }
});
