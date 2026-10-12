import { RouterProvider } from 'react-router'
import { AppDataProvider } from './data/AppData'
import { PhaseProvider } from './design/PhaseProvider'
import { useTapFeedback } from './feedback/useTapFeedback'
import { router } from './router'

export function Root() {
  useTapFeedback()
  return (
    <PhaseProvider>
      <AppDataProvider>
        <RouterProvider router={router} />
      </AppDataProvider>
    </PhaseProvider>
  )
}
