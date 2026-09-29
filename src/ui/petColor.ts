import { createContext } from 'react'
import type { PetColor } from '../domain/types'

export interface PetPalette {
  label: string
  body: string
  /** ears and arms */
  shade: string
  blush: string
}

export const PET_PALETTES: Record<PetColor, PetPalette> = {
  mint: { label: 'Mint', body: '#b8e0d2', shade: '#8fcab5', blush: '#ffb3c6' },
  peach: { label: 'Peach', body: '#ffd3b6', shade: '#f7b58f', blush: '#ff9aa8' },
  lavender: { label: 'Lavender', body: '#d9c8f0', shade: '#bda5e3', blush: '#ffa8c5' },
  sky: { label: 'Sky', body: '#bfe3f5', shade: '#93cdea', blush: '#ffb3c6' },
  lemon: { label: 'Lemon', body: '#fff1a8', shade: '#f2dc6b', blush: '#ffae9e' },
  rose: { label: 'Rose', body: '#ffc8d6', shade: '#f5a3b9', blush: '#f0708f' },
}

export const PET_COLORS = Object.keys(PET_PALETTES) as PetColor[]

/** The signed-in user's pet colour; PetSprite falls back to this when no colour prop is given. */
export const PetColorContext = createContext<PetColor>('mint')
