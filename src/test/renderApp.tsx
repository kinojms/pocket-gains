import { render } from '@testing-library/react'
import { RouterProvider, createMemoryRouter, type RouteObject } from 'react-router'
import { AppDataProvider } from '../data/AppData'
import { LockInDB } from '../data/db'

export async function makeTestDb(seed?: (db: LockInDB) => Promise<void>): Promise<LockInDB> {
  const db = new LockInDB(`test-${crypto.randomUUID()}`)
  if (seed) await seed(db)
  return db
}

export function renderRoutes(db: LockInDB, routes: RouteObject[], initialEntries: string[]) {
  const router = createMemoryRouter(routes, { initialEntries })
  render(
    <AppDataProvider database={db}>
      <RouterProvider router={router} />
    </AppDataProvider>,
  )
  return router
}
