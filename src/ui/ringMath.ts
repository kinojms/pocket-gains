/** Dash offset for a progress ring: 0 shows nothing, 1 the full circle. */
export function ringOffset(value: number, circumference: number): number {
  const v = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0
  return circumference * (1 - v)
}
