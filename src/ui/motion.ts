/** Without matchMedia (tests, very old browsers) we play it safe and skip motion. */
export function prefersReducedMotion(): boolean {
  return typeof window.matchMedia !== 'function' || window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
