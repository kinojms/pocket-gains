import { mkdir, readFile, writeFile } from 'node:fs/promises'

const RAW = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main'
const map = JSON.parse(await readFile(new URL('./image-map.json', import.meta.url), 'utf8'))
const exercises = JSON.parse(await readFile(new URL('../src/content/exercises.json', import.meta.url), 'utf8'))

const res = await fetch(`${RAW}/dist/exercises.json`)
if (!res.ok) throw new Error(`dataset download failed: HTTP ${res.status}`)
const dataset = await res.json()
const byId = new Map(dataset.map((d) => [d.id, d]))

const problems = []
for (const ex of exercises) {
  if (ex.movement === 'warmup') continue
  if (!(ex.id in map)) {
    problems.push(`${ex.id}: missing from image-map.json (use null for "no image")`)
    continue
  }
  const dsId = map[ex.id]
  if (dsId !== null && !byId.has(dsId)) {
    const words = ex.name.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 2)
    const candidates = dataset
      .filter((d) => words.some((w) => d.name.toLowerCase().includes(w)))
      .slice(0, 10)
      .map((d) => `${d.id} ("${d.name}")`)
    problems.push(`${ex.id}: "${dsId}" not in dataset. Candidates: ${candidates.join(', ') || 'none, so use null'}`)
  }
}
if (problems.length) {
  console.error(problems.join('\n'))
  process.exit(1)
}

await mkdir(new URL('../public/exercises/', import.meta.url), { recursive: true })
const downloaded = []
for (const [ourId, dsId] of Object.entries(map)) {
  if (dsId === null) continue
  const path = byId.get(dsId).images[0]
  const r = await fetch(`${RAW}/exercises/${path}`)
  if (!r.ok) throw new Error(`${ourId}: image download failed: HTTP ${r.status}`)
  await writeFile(new URL(`../public/exercises/${ourId}.jpg`, import.meta.url), Buffer.from(await r.arrayBuffer()))
  downloaded.push(ourId)
}
downloaded.sort()
await writeFile(
  new URL('../src/content/images.generated.json', import.meta.url),
  JSON.stringify(downloaded, null, 2) + '\n',
)
const fallbacks = Object.values(map).filter((v) => v === null).length
console.log(`Downloaded ${downloaded.length} images; ${fallbacks} exercises use the pixel fallback.`)
