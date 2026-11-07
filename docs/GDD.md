# Game Design Document

> Status: **seed**. Holds only what the team has already decided. It grows during `/grill-with-docs` sessions.

## Pitch

A tycoon game: you start as a small space company, build an economy, and design, launch and simulate increasingly ambitious missions (Earth orbit → Moon → Mars → beyond). Mission trade-offs feel real because the parts and money behind them come from the company you built.

## Decided so far

- **Genre:** tycoon in the spirit of RollerCoaster Tycoon / Cities: Skylines. **Not** a full Factorio-style factory (no complex belt and logistics puzzles).
- **Split:** about **40% company/economy, 60% space mission design**. Mission design is the core loop, and the economy feeds it.
- **Economy start:** income begins with things like **mines** you place to generate money and resources.
- **Map:** the starting site is **randomly generated from a seed**. Players can enter a seed to get the same map.
- **Look:** 2.5D, nice-looking graphics: low-poly 3D models seen through a fixed isometric camera (see ADR-0001).
- **Audience:** students and beginners (the challenge is rated Beginner/Youth and Intermediate), so it must be easy to pick up.
- **Saves:** progress is saved locally and in the cloud.
- **Online (async multiplayer ideas):** leaderboards and score sharing; visiting another player's base and seeing what they were doing; sending help or requests; competitive "who sends the best rocket" battles on the same objective.
- **Platform:** browser on Windows, macOS and Linux (see ADR-0001).

## Open questions (for the next design session)

- Where does the player start: on **Earth** (HQ + launch site, where latitude matters for launches) or on the **Moon or another body**? One map, or unlockable maps?
- What do mines produce: raw materials that become spacecraft parts, or just money? Other income sources (contracts, selling data, grants, tourism)?
- How detailed is spacecraft design: part by part, or presets with tweaks?
- How is the mission simulation shown: 2.5D launch/orbit animation, mission-control dashboard and event log, or both?
- What happens on failure (money and reputation loss, failure report)? Is there a free test/simulation mode?
- Multiplayer scope for the hackathon: is live 4-player co-op with roles a must, or a later feature?
- Visual mood (cozy and colourful / clean NASA-realistic / retro-futuristic) and reference games.
- Game name.
- Team: size and skills (who directs, tests, presents).
