import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { UpdateBanner } from './UpdateBanner'

const h = vi.hoisted(() => ({ update: vi.fn(async () => undefined), dismiss: vi.fn(), needRefresh: true }))
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({ needRefresh: [h.needRefresh, h.dismiss], offlineReady: [false, () => undefined], updateServiceWorker: h.update }),
}))

describe('UpdateBanner', () => {
  it('offers the update and applies it only when asked', async () => {
    render(<UpdateBanner />)
    expect(screen.getByRole('status')).toHaveTextContent(/new version/)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Update' }))
    expect(h.update).toHaveBeenCalledWith(true)
  })

  it('can be postponed, and renders nothing when there is no update', async () => {
    const { unmount } = render(<UpdateBanner />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Later' }))
    expect(h.dismiss).toHaveBeenCalledWith(false)
    unmount()
    h.needRefresh = false
    const { container } = render(<UpdateBanner />)
    expect(container).toBeEmptyDOMElement()
  })
})
