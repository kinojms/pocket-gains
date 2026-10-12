import { describe, expect, it } from 'vitest'
import { supabaseRemote } from './remote'

function fakeClient(pages: number[]) {
  const calls: string[] = []
  let i = 0
  const client = {
    from: (table: string) => ({
      select: () => ({
        order: (col: string) => {
          calls.push(`${table}:order:${col}`)
          return {
            range: async (a: number, b: number) => {
              calls.push(`range:${a}-${b}`)
              return { data: Array.from({ length: pages[i++] }, (_, k) => ({ id: `${a + k}` })), error: null }
            },
          }
        },
      }),
    }),
  }
  return { client, calls }
}

describe('supabaseRemote.fetchAll', () => {
  it('pages in a stable order by primary key', async () => {
    const { client, calls } = fakeClient([1000, 3])
    const rows = await supabaseRemote(client as never).fetchAll('set_log')
    expect(rows).toHaveLength(1003)
    expect(calls).toEqual(['set_log:order:id', 'range:0-999', 'set_log:order:id', 'range:1000-1999'])
  })

  it('orders the profile table by user_id', async () => {
    const { client, calls } = fakeClient([1])
    await supabaseRemote(client as never).fetchAll('profile')
    expect(calls[0]).toBe('profile:order:user_id')
  })
})
