import { readFileSync } from 'node:fs';

/**
 * Reads a NASA Mission Viz source file from docs/research/sources/mission-viz/ as text (never runs it), the same
 * way scripts/build_reference_paths.py does. For tests only: the game itself never imports this (it needs Node).
 * Each point: minutes from the first point, then X, Y, Z in km (Earth-centred, equatorial).
 */
export function readMissionVizSource(file: string): { minutes: number; x: number; y: number; z: number }[] {
  let text = readFileSync(`docs/research/sources/mission-viz/${file}`, 'utf8').replace(/^﻿/, '');
  if (file.endsWith('.js')) text = [...text.matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1]).join('');
  const raw = JSON.parse(text).coordinates as { Date: string; Time: string; X: number; Y: number; Z: number }[];
  const when = (p: { Date: string; Time: string }) => Date.parse(`${p.Date.trim()} ${p.Time} UTC`);
  return raw.map((p) => ({ minutes: (when(p) - when(raw[0])) / 60_000, x: p.X, y: p.Y, z: p.Z }));
}
