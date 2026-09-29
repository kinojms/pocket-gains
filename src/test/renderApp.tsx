import { render } from '@testing-library/react'
import { RouterProvider, createMemoryRouter, type RouteObject } from 'react-router'
import { AppDataProvider } from '../data/AppData'
import { PocketGainsDB } from '../data/db'

export async function makeTestDb(seed?: (db: PocketGainsDB) => Promise<void>): Promise<PocketGainsDB> {
  const db = new PocketGainsDB(`test-${crypto.randomUUID()}`)
  if (seed) await seed(db)
  return db
}

export function renderRoutes(db: PocketGainsDB, routes: RouteObject[], initialEntries: string[]) {
  const router = createMemoryRouter(routes, { initialEntries })
  render(
    <AppDataProvider database={db}>
      <RouterProvider router={router} />
    </AppDataProvider>,
  )
  return router
}
