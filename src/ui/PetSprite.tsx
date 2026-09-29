// Starter sprite (M1). Body traits arrive in M4.
const STARTER = [
  '................',
  '................',
  '....oo....oo....',
  '....oo....oo....',
  '....bbbbbbbb....',
  '...bbbbbbbbbb...',
  '...bbWKbbWKbb...',
  '...bbKKbbKKbb...',
  '...bbbbbbbbbb...',
  '...bpbbrrbbpb...',
  '....bbbbbbbb....',
  '....obllllbo....',
  '....obllllbo....',
  '.....bbbbbb.....',
  '.....oo..oo.....',
  '................',
]

const PALETTE: Record<string, string> = {
  o: '#f28c38', b: '#f7a64a', l: '#ffe0b3', K: '#1b1b1b', W: '#ffffff', r: '#c0392b', p: '#ff9aa2',
}

export function PetSprite({ size = 160, bounce = false }: { size?: number; bounce?: boolean }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges"
      className={bounce ? 'pet-bounce' : undefined} role="img" aria-label="Your pet"
    >
      {STARTER.flatMap((row, y) =>
        [...row].map((ch, x) => (ch === '.' ? null : <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={PALETTE[ch]} />)),
      )}
    </svg>
  )
}
