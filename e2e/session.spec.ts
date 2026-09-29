import { expect, test, type Page } from '@playwright/test'

async function onboard(page: Page, experience: RegExp) {
  await page.goto('./')
  await page.getByRole('checkbox', { name: /I understand/ }).check()
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: experience }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: /Hatch/ }).click()
  await expect(page.getByRole('link', { name: /Deal my hand/ })).toBeVisible()
}

async function startSession(page: Page, opts: { sets?: 'decrease'; cards?: 'decrease' } = {}) {
  await page.getByRole('link', { name: /Deal my hand/ }).click()
  if (opts.sets) await page.getByRole('button', { name: 'Decrease Sets' }).click()
  if (opts.cards) await page.getByRole('button', { name: 'Decrease Cards' }).click()
  await page.getByRole('button', { name: /Deal my hand/ }).click()
  await page.getByRole('button', { name: /Start/ }).click()
  await page.getByRole('button', { name: /Start first card/ }).click()
}

test('first session end to end: onboarding, full hand, summary, level up, progress', async ({ page }) => {
  await onboard(page, /New to training/)
  await startSession(page, { sets: 'decrease', cards: 'decrease' }) // 1 set x 3 cards

  for (let card = 0; card < 3; card++) {
    await page.getByRole('button', { name: /start set 1/i }).click()
    await page.getByRole('button', { name: /Log set/ }).click()
    if (card < 2) await page.getByRole('button', { name: /Skip rest/ }).click()
  }

  await expect(page.getByRole('heading', { name: 'Hand cleared!' })).toBeVisible()
  await expect(page.getByText('+55 XP')).toBeVisible()
  await page.getByRole('button', { name: 'Done' }).click()
  await expect(page.getByText(/Lv 2/)).toBeVisible()

  await page.getByRole('link', { name: /Progress/ }).click()
  await expect(page.getByText('Complete')).toBeVisible()
})

test('reloading mid-session resumes it; ending early as too hard eases the next session', async ({ page }) => {
  await onboard(page, /New to training/)
  await startSession(page)
  await page.getByRole('button', { name: /start set 1/i }).click()
  await page.getByRole('button', { name: /Log set/ }).click()
  await expect(page.getByRole('timer', { name: /Rest/ })).toBeVisible()
  // wait until the rest state is actually saved before simulating the app being killed
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise<string | undefined>((resolve) => {
            const open = indexedDB.open('lock-in')
            open.onsuccess = () => {
              const get = open.result.transaction('kv').objectStore('kv').get('activeSession')
              get.onsuccess = () => {
                resolve((get.result as { value?: { phase?: string } } | undefined)?.value?.phase)
                open.result.close()
              }
            }
          }),
      ),
    )
    .toBe('rest')

  await page.reload()
  await expect(page.getByRole('timer', { name: /Rest/ })).toBeVisible()

  await page.getByRole('button', { name: 'End session' }).click()
  await page.getByRole('button', { name: /Too hard/ }).click()
  await expect(page.getByRole('heading', { name: 'Session saved' })).toBeVisible()
  await expect(page.getByText('+10 XP')).toBeVisible()
  await page.getByRole('button', { name: 'Done' }).click()

  await page.getByRole('link', { name: /Deal my hand/ }).click()
  await expect(page.getByText(/felt too hard/)).toBeVisible()
  await expect(page.getByRole('status', { name: 'Sets' })).toHaveText('1')
})

test('manifest installs the app under /lock_in/', async ({ request }) => {
  const res = await request.get('manifest.webmanifest')
  expect(res.ok()).toBe(true)
  const manifest = await res.json()
  expect(manifest.start_url).toBe('/lock_in/')
  expect(manifest.scope).toBe('/lock_in/')
})
