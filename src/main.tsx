import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './design/fonts'
import { applyPhase } from './design/palette'
import { dayPhaseFor } from './domain/dayPhase'
import { Root } from './Root'
import './theme.css'

// Colours exist before the first paint.
applyPhase(dayPhaseFor(new Date()))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
