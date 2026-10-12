// Generates Web Push (VAPID) keys and stores them where they belong, without printing the private key.
//   usage: node scripts/setup-vapid.mjs <supabase-project-ref> <contact-email>
// Needs: `npx supabase login` and `gh auth login` done first.
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import webpush from 'web-push'

const [ref, email] = process.argv.slice(2)
if (!ref || !email) {
  console.error('usage: node scripts/setup-vapid.mjs <supabase-project-ref> <contact-email>')
  process.exit(1)
}
const { publicKey, privateKey } = webpush.generateVAPIDKeys()
const shell = process.platform === 'win32'

execFileSync(
  'npx',
  ['supabase', 'secrets', 'set', `VAPID_PUBLIC_KEY=${publicKey}`, `VAPID_PRIVATE_KEY=${privateKey}`, `VAPID_CONTACT_EMAIL=${email}`, '--project-ref', ref],
  { stdio: ['ignore', 'inherit', 'inherit'], shell },
)
execFileSync('gh', ['variable', 'set', 'VITE_VAPID_PUBLIC_KEY', '--body', publicKey], { stdio: 'inherit', shell })

const envFile = '.env.local'
const lines = existsSync(envFile) ? readFileSync(envFile, 'utf8').split(/\r?\n/).filter((l) => l && !l.startsWith('VITE_VAPID_PUBLIC_KEY=')) : []
writeFileSync(envFile, [...lines, `VITE_VAPID_PUBLIC_KEY=${publicKey}`].join('\n') + '\n')
console.log(`VAPID keys set (Supabase secrets, GitHub variable, ${envFile}). Public key: ${publicKey}`)
