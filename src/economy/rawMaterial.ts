/** Raw Materials a Mine can dig up. More arrive in later Eras (see docs/GDD.md §4). */
export const RAW_MATERIALS = ['aluminium', 'copper', 'silicon'] as const;

export type RawMaterial = (typeof RAW_MATERIALS)[number];
