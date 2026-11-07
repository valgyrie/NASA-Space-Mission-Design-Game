# Web stack: TypeScript + Three.js + HTML/CSS UI + Supabase

The game is built as a web app (TypeScript, Vite, Three.js for the low-poly isometric 2.5D world, HTML/CSS for the mission-design UI, Supabase for leaderboards, cloud saves and other async multiplayer) instead of Godot. Claude writes all the code and art and can only run and visually test a browser game in its cloud environment (headless Chromium, no Godot, no GPU). It also writes JS/TS more reliably than GDScript. Most of the game (60%) is dashboard-style UI, where HTML is strongest. And judges can play from a link on any OS.

**Considered options:** Godot 4. It has better lighting out of the box and native exports, but Claude would be working blind, Godot 3/4 API mix-ups are common, and the web build is a much larger download.

**Consequences:** Desktop builds, if wanted later, are packaged with Electron (same Chromium on every OS) rather than Tauri. PWA install is the cheap option for the hackathon.
