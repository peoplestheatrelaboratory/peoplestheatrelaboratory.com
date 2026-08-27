/** Lunar phase as a fraction of the synodic month: 0 = new, 0.5 = full. */
const SYNODIC = 29.530588853;
const REF_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14); // a known new moon

export function moonPhase(date: Date): number {
  const days = (date.getTime() - REF_NEW_MOON) / 86_400_000;
  const f = (days / SYNODIC) % 1;
  return f < 0 ? f + 1 : f;
}

export function phaseName(f: number): string {
  if (f < 0.03 || f > 0.97) return 'new moon';
  if (f < 0.22) return 'waxing crescent';
  if (f < 0.28) return 'first quarter';
  if (f < 0.47) return 'waxing gibbous';
  if (f < 0.53) return 'full moon';
  if (f < 0.72) return 'waning gibbous';
  if (f < 0.78) return 'last quarter';
  return 'waning crescent';
}
