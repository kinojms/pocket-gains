import { describe, expect, it } from 'vitest'
import { subscribePush, urlBase64ToUint8Array } from './push'

describe('push helpers', () => {
  it('decodes URL-safe base64 VAPID keys', () => {
    expect([...urlBase64ToUint8Array('AQID')]).toEqual([1, 2, 3])
    expect([...urlBase64ToUint8Array('-_8')]).toEqual([251, 255])
  })

  it('reports unsupported where there is no Push API (or no key)', async () => {
    expect(await subscribePush({} as never, 'key')).toBe('unsupported')
    expect(await subscribePush({} as never, undefined)).toBe('unsupported')
  })
})
