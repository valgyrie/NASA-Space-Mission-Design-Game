import type { Finding } from './mission';

/**
 * NASA's four mission Segments (Design and Develop Science Missions, slide 8). Shown in this order:
 * "begin with the end in mind" (slide 15), so the people who use the Data come first.
 * Named MissionSegment because ascent.ts already has a Segment for parts of the Launch show.
 */
export const MISSION_SEGMENTS = ['user', 'space', 'ground', 'launch'] as const;
export type MissionSegment = (typeof MISSION_SEGMENTS)[number];

/**
 * Which Segment a Mission Report line belongs to. Reaching orbit is the Launch segment's job, unless the rocket
 * did its part and the Spacecraft had no main engine for the rest. The Data getting home is the Ground segment's;
 * the deadline is the client's.
 */
export function findingSegment(f: Finding): MissionSegment {
  switch (f.kind) {
    case 'orbit':
      return f.noEngine ? 'space' : 'launch';
    case 'payload':
    case 'power':
      return 'space';
    case 'comms':
      return 'ground';
    case 'time':
      return 'user';
  }
}

/** Items grouped under their Segment, in Segment order; a Segment with nothing in it is left out. */
export function bySegment<T>(items: readonly T[], segmentOf: (item: T) => MissionSegment): { segment: MissionSegment; items: T[] }[] {
  return MISSION_SEGMENTS.map((segment) => ({ segment, items: items.filter((item) => segmentOf(item) === segment) })).filter(
    (group) => group.items.length > 0,
  );
}
