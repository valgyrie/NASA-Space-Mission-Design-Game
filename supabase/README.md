# Online setup

The team's project is `NASA-Space-Mission-Design-Game` (`oyslhxxgxtqhgpfivwcb`). Tickets 22 and 23's migrations and the `leap-online` function are deployed there. The public endpoint is in `src/online/client.ts`. Local play needs no Supabase configuration.

**Switched off in the game for now (15 Nov 2026, ticket 53):** the Online buttons are greyed out with "Coming soon". The game's save is now v21, so rebuild and redeploy `leap-online` (steps below) before switching Online back on; the deployed bundle was built for an older save version.

## Updating the backend

1. Run `npm run check` and `npm run build:online`. The latter bundles the shared name filter, save validator and score rules into `work/online-edge/index.js` using the existing Vite dependency.
2. Apply any new files in `supabase/migrations/` with the Supabase migration tool. Do not rerun existing migrations.
3. Deploy the generated `work/online-edge/index.js` as the `leap-online` function with JWT verification disabled. The function authenticates private requests itself with the recovery code. With an authenticated Supabase CLI, `supabase functions deploy leap-online --project-ref oyslhxxgxtqhgpfivwcb` uses `config.toml`'s generated entrypoint. The live deployment was checked through the connected Supabase tools. Without the CLI, the Management API's `POST /v1/projects/<ref>/functions/deploy?slug=leap-online` (multipart `metadata` with `entrypoint_path: index.js`, `verify_jwt: false`, plus the bundle as `index.js`) does the same; this is how version 5 (save v19) was deployed on 13 November 2026.
4. Check the live endpoint and a browser save/recovery round trip. Changes to the shared save format, name filter or score rules need a backend rebuild and deployment too.

The function uses Supabase's server-side `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`; never put the service key in the game, repository or chat. No new npm dependencies are required.

## Alouette History card: deployed (ticket 37)

After explicit user approval on 14 Nov 2026, the prepared bundle from merged PR #43 was deployed as active `leap-online` **version 6**, preserving `verify_jwt = false` and the existing recovery-code authentication. Bundle SHA-256: `64a59c339d89e15e2bc7803356d02ba3a51569aeb68a5fb129fc7379b2b359af`. No schema migration or save-version bump was needed.

The shared validator recognizes `alouette1`, including when a Campaign continues into Free Play. Before deployment, v5 accepted the control v19 save but returned HTTP 400 `invalidSave` with the new ID. After deployment, save and load returned HTTP 200 and preserved the entire save. A Chromium check using the real `OnlineClient` also recovered the account, saved, recovered on a second client and loaded the same save with the new card (revision 4).

**Cleanup remains pending:** the user approved deleting the synthetic verification account `Ticket37Check`, ID `8255a026-af45-440c-830c-435eb6b096b4`. Supabase expired both renewed SQL confirmations before deletion executed; a read-only count confirmed one matching record remains. The account has the synthetic Free Play save (revision 4) and may appear in leaderboards. No weekly submissions were made. Approval is already recorded; the remaining step is completing the connector's deletion confirmation, then checking zero matches. Remove only this ID and nickname:

```sql
DELETE FROM public.leap_players
WHERE id = '8255a026-af45-440c-830c-435eb6b096b4'
  AND nickname = 'Ticket37Check'
RETURNING id;

SELECT count(*) AS remaining FROM public.leap_players
WHERE id = '8255a026-af45-440c-830c-435eb6b096b4';
```

## Data and authentication

- Each account has a random UUID, filtered nickname and SHA-256 hash of a 160-bit random recovery code. The browser keeps the code in `leap.online`, separate from `leap.save` and `leap.demo`. A copied code restores the account on another browser; the player then explicitly loads its Company. No email, password, real name or Supabase Auth identity is required.
- `leap_players` holds one private Free Play save, its revision/date and four derived scores. RLS is enabled, with no client policies, and all `anon`/`authenticated` table grants are revoked. Only the function's service role accesses it. The security advisor's “RLS Enabled No Policy” informational notice is intentional: browsers have no direct table access.
- Requests use HTTPS POST bodies. Codes are never URL parameters, database plaintext, leaderboard results or application logs. Anyone holding the code controls that account. There is no code reset; losing all copies loses access.
- Leaderboards expose only nickname and scores. Scores are derived server-side from validated player saves, which remain editable on the player's computer. This is a casual leaderboard, without authoritative simulation or anti-cheat.
- Save is manual and replaces the account's previous cloud Company. Load requires a second confirmation before replacing local data. Revision checks reject simultaneous writes; offline failures leave local data alone. Demo Mode never uploads automatically, and its pause menu has no Online action.

Supabase references: [function configuration](https://supabase.com/docs/guides/functions/function-configuration), [deployment](https://supabase.com/docs/guides/functions/deploy), [RLS informational notice](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

## Weekly Challenge

`weekly_challenge` adds `leap_weekly` and the service-only `leap_submit_weekly` SQL function. The same RLS/grant boundary as `leap_players` applies. The SQL function uses one upsert with `greatest` to retain the best score under concurrent requests; it is `security invoker`, with an empty search path and no public, `anon` or `authenticated` execution grant. The table has indexes for weekly ordering and account rewards. Its no-policy informational notice is intentional too.

The Edge Function authenticates with the recovery code, selects the week using its UTC clock and evaluates only a submitted design through `src/game/weekly.ts`. Client scores, budgets, tech and Company resources are never accepted. Only successful attempts enter the table. Responses expose nicknames and scores, plus the caller's own earned weeks and podium ranks; IDs and recovery hashes stay private. Completed weeks reject new submissions. A successful entry is the finisher patch; final top-three ranks are the podium badges. There is no scheduled job or extra reward currency to sync. Future scoring changes must keep previous weeks' stored scores intact and be deployed with their client changes.

SQL RPCs returning `void` produce an empty 204 response; the shared database helper handles that explicitly. Rebuild and deploy the function whenever the shared weekly rules change. These casual boards do not add rate limiting or prevent players from creating multiple anonymous accounts.
