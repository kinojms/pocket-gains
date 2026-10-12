import { RouterProvider } from 'react-router'
import { AppDataProvider } from './data/AppData'
import { PhaseProvider } from './design/PhaseProvider'
import { router } from './router'

export function Root() {
  return (
    <PhaseProvider>
      <AppDataProvider>
        <RouterProvider router={router} />
      </AppDataProvider>
    </PhaseProvider>
  )
}
