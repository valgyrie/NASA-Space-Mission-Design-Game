import { describe, expect, it } from 'vitest';
import { generateSite } from '../site/site';
import { LAUNCH_WEATHER } from './balance';
import { liftFactor, liftFrom, spinSpeed } from './launchVehicles';
import { launch, launchWeather, planLaunch, shipMission } from './mission';
import {
  JPL,
  adviseLaunch,
  climateAt,
  dayOfYear,
  distanceKm,
  isInUs,
  placeFromNumber,
  placeProblem,
  shippingTo,
  siteClimateFor,
  weatherOn,
} from './places';
import { acceptContract } from './contracts';
import { newSiteState } from './siteState';
import { choose, partsNeeded } from './spacecraft';

describe('real places', () => {
  it('has the real 2025 climate at JPL, and none over the sea', () => {
    const c = climateAt(JPL.lat, JPL.lon)!;
    // NASA POWER 2025 near Pasadena: about 18 °C, 1.4 mm of rain a day, 5.5 kWh/m² of sun (2-degree average).
    expect(c.tempC).toBeGreaterThan(10);
    expect(c.tempC).toBeLessThan(25);
    expect(c.sunKwh).toBeGreaterThan(4.5);
    expect(climateAt(0, -140)).toBeNull(); // the middle of the Pacific
  });

  it('knows which land is in the US', () => {
    expect(isInUs(JPL.lat, JPL.lon)).toBe(true);
    expect(isInUs(48.85, 2.35)).toBe(false); // Paris
    expect(placeProblem(48.85, 2.35, 'us')).toBe('notUs');
    expect(placeProblem(48.85, 2.35, 'anywhere')).toBeNull();
    expect(placeProblem(0, -140, 'anywhere')).toBe('sea');
  });

  it('draws Random starts on land of the right kind', () => {
    for (let i = 0; i < 20; i++) {
      const us = placeFromNumber('us', `us${i}`);
      expect(placeProblem(us.lat, us.lon, 'us')).toBeNull();
      const any = placeFromNumber('anywhere', `any${i}`);
      expect(placeProblem(any.lat, any.lon, 'anywhere')).toBeNull();
    }
  });

  it('shapes the Site from the real place: a desert is dry, a coast has its sea, the cold is snowy', () => {
    const sahara = siteClimateFor({ lat: 23, lon: 12, start: 'anywhere' })!;
    expect(sahara.dryness).toBeGreaterThan(0.8);
    expect(sahara.water).toBe('inland');
    const coast = siteClimateFor({ lat: 28.4, lon: -80.7, start: 'us' })!; // Florida's Space Coast
    expect(coast.water).toBe('coast');
    expect(generateSite('K7QXM2', coast).water).toBe('coast');
    expect(generateSite('K7QXM2', sahara).water).not.toBe('coast');
    const alaska = siteClimateFor({ lat: 65, lon: -150, start: 'us' })!;
    expect(alaska.snow).toBeGreaterThan(0.5);
    expect(siteClimateFor({ ...JPL, start: 'legacy' })).toBeUndefined();
  });

  it('gives mountain places more high ground', () => {
    const flat = siteClimateFor({ lat: 52, lon: 5, start: 'anywhere' })!; // the Netherlands
    const high = siteClimateFor({ lat: 39, lon: -106, start: 'us' })!; // Colorado's Rockies
    expect(high.relief!).toBeGreaterThan(flat.relief!);
    const height = (c: typeof flat) => generateSite('K7QXM2', c).tiles.reduce((s, t) => s + t.level, 0);
    expect(height(high)).toBeGreaterThan(height(flat));
  });
});

describe('Shipping by distance', () => {
  it('costs $25,000 and 7 days from JPL to Cape Canaveral, as before', () => {
    expect(distanceKm(JPL, { lat: 28.44, lon: -80.57 })).toBeGreaterThan(3400);
    expect(shippingTo(JPL, 'capeCanaveral')).toMatchObject({ cost: 25_000, days: 7 });
  });

  it('costs more from further away', () => {
    const sydney = { lat: -33.9, lon: 151.2, start: 'anywhere' as const };
    expect(shippingTo(sydney, 'capeCanaveral').cost).toBeGreaterThan(80_000);
    expect(shippingTo(sydney, 'capeCanaveral').days).toBeGreaterThan(20);
    const virginia = { lat: 37.5, lon: -77.4, start: 'us' as const };
    expect(shippingTo(virginia, 'wallops').days).toBeLessThan(shippingTo(virginia, 'capeCanaveral').days);
  });
});

describe('latitude and lift', () => {
  it("gives 465 m/s of Earth's spin at the equator, less further north", () => {
    expect(Math.round(spinSpeed(0))).toBe(465);
    expect(spinSpeed(37.84)).toBeLessThan(spinSpeed(28.44));
  });

  it('lifts less from Wallops Island than from Cape Canaveral', () => {
    expect(liftFactor('capeCanaveral')).toBe(1);
    expect(liftFactor('wallops')).toBeCloseTo(0.958, 2);
    expect(liftFrom('thorAble', 'lowEarthOrbit', 'wallops')).toBeLessThan(120);
    expect(liftFrom('thorAble', 'lowEarthOrbit', 'capeCanaveral')).toBe(120);
  });

  it('checks the mass against the lift from the chosen Launch Site', () => {
    const state = newSiteState();
    acceptContract(state, 'explorer1');
    for (const id of ['smallBus', 'batteriesOnly', 'largeBattery', 'simpleAntenna', 'spin', 'radiationDetector'] as const) {
      choose(state.design, id);
    }
    expect(planLaunch(state, state.design, 'juno1', 'wallops').liftKg).toBe(13.4);
    expect(planLaunch(state, state.design, 'juno1', 'capeCanaveral').liftKg).toBe(14);
  });
});

describe('launch weather', () => {
  it('maps every Game day onto a day of 2025', () => {
    expect(dayOfYear(0)).toBe(0); // 1 January 1958
    expect(dayOfYear(364)).toBe(364);
    expect(dayOfYear(365)).toBe(0);
    // 1960 is a leap year: 29 February counts as the 28th, 1 March is still day 59.
    const leapMar1 = Math.round((Date.UTC(1960, 2, 1) - Date.UTC(1958, 0, 1)) / 86_400_000);
    expect(dayOfYear(leapMar1)).toBe(59);
  });

  it('Scrubs on days over the limits, and only those', () => {
    let scrubs = 0;
    for (let day = 0; day < 365; day++) {
      const w = weatherOn('capeCanaveral', day);
      const storm = w.rainMm >= LAUNCH_WEATHER.stormRainMm && w.hotC >= LAUNCH_WEATHER.stormHotC;
      expect(w.scrub !== null).toBe(storm || w.windMs > LAUNCH_WEATHER.windLimitMs);
      if (w.scrub) scrubs++;
    }
    // Some days, not most: Florida's summer storms Scrub real launches too.
    expect(scrubs).toBeGreaterThan(5);
    expect(scrubs).toBeLessThan(120);
  });

  it('advises a day that can go, the calmest first', () => {
    for (let day = 0; day < 365; day += 7) {
      const advice = adviseLaunch('capeCanaveral', day);
      if (!advice) continue;
      expect(advice.weather.scrub).toBeNull();
      expect(advice.day).toBeGreaterThanOrEqual(day);
      expect(advice.day).toBeLessThan(day + LAUNCH_WEATHER.adviseDays);
    }
  });

  it('will not Launch on a Scrub day, and Launches on the advised day', () => {
    const state = newSiteState();
    acceptContract(state, 'explorer1');
    for (const id of ['smallBus', 'batteriesOnly', 'largeBattery', 'simpleAntenna', 'spin', 'radiationDetector'] as const) {
      choose(state.design, id);
    }
    for (const p of partsNeeded(state.design)) state.parts[p] += 1;
    expect(shipMission(state, state.design).ok).toBe(true);
    let scrubDay = state.mission!.readyDay;
    while (!weatherOn('capeCanaveral', scrubDay).scrub) scrubDay++;
    state.day = scrubDay;
    expect(launchWeather(state)?.scrub).not.toBeNull();
    expect(launch(state, 'K7QXM2')).toBeNull();
    expect(state.mission).not.toBeNull();
    state.day = adviseLaunch('capeCanaveral', scrubDay)!.day;
    expect(launch(state, 'K7QXM2')).not.toBeNull();
  });
});
