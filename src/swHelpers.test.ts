import { describe, expect, it } from 'vitest'
import { appWindow } from './swHelpers'

describe('appWindow', () => {
  it('picks a window of this app, not another app on the same origin', () => {
    const scope = 'https://kinojms.github.io/pocket-gains/'
    const other = { url: 'https://kinojms.github.io/tsukino-prescript/' }
    const mine = { url: 'https://kinojms.github.io/pocket-gains/#/progress' }
    expect(appWindow([other, mine], scope)).toBe(mine)
    expect(appWindow([other], scope)).toBeUndefined()
  })
})
