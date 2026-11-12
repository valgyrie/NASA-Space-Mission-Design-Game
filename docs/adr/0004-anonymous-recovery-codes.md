# Anonymous accounts use secret recovery codes

Ticket 22 requires account recovery on another computer without email, passwords or personal details (GDD §12). A Supabase anonymous Auth session alone cannot be recovered after losing its browser session without adding another identity.

Use one Supabase Edge Function to create anonymous player records and authenticate their private operations with a random 160-bit recovery code. Store only its SHA-256 hash in the database; keep the code in the player's browser and let them copy it. The function uses Supabase's service role internally. RLS and revoked client grants block direct table access. Nicknames are filtered with the existing name checker on both client and server. Leaderboard responses include only nicknames and scores.

**Trade-off:** the code grants access to the account. There is no email-based reset or support recovery; losing the code and browser data loses the account. Supabase Auth and identity linking can be reconsidered if a later design allows personal identities. We keep local play available without creating an account.

**Cloud saves:** explicit Save and Load actions, one Free Play Company per account. Load confirms replacing the local Company. Revision checks reject simultaneous writes. This avoids background overwrites across computers and keeps Campaign and Demo Mode local.

Implementation and deployment: `supabase/README.md`. Supabase's [anonymous sign-ins guide](https://supabase.com/docs/guides/auth/auth-anonymous) describes their session recovery limitation; [function configuration](https://supabase.com/docs/guides/functions/function-configuration) supports function-managed authentication.
