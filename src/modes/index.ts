import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import type { ModeProps } from './types'

export interface ModeInfo {
  id: string
  name: string
  icon: string
  blurb: string
  /** Study modes expose you to the text; test modes grade you and schedule reviews. */
  kind: 'study' | 'test'
  Component: LazyExoticComponent<ComponentType<ModeProps>>
  /** Needs more than one unit to make sense. */
  minChunks?: number
}

export const MODES: ModeInfo[] = [
  { id: 'read', name: 'Read & listen', icon: '📖', kind: 'study', blurb: 'Read it through, or hear it read aloud line by line.', Component: lazy(() => import('./Read')) },
  { id: 'initials', name: 'First letters', icon: '🔤', kind: 'study', blurb: 'Only the first letter of each word. Say the rest in your head.', Component: lazy(() => import('./FirstLetters')) },
  { id: 'fade', name: 'Fade out', icon: '🌫️', kind: 'study', blurb: 'Words vanish step by step until none are left.', Component: lazy(() => import('./Fade')) },
  { id: 'type-initials', name: 'Type first letters', icon: '⌨️', kind: 'test', blurb: 'Type the first letter of every word from memory. Fast on a phone.', Component: lazy(() => import('./TypeInitials')) },
  { id: 'buildup', name: 'Build up', icon: '🧱', kind: 'test', blurb: 'Add one part at a time and recall from the start each round.', Component: lazy(() => import('./BuildUp')) },
  { id: 'blanks', name: 'Fill the blanks', icon: '✏️', kind: 'test', blurb: 'Type in the missing words. Choose how many go.', Component: lazy(() => import('./Blanks')) },
  { id: 'choice', name: 'What comes next?', icon: '🎯', kind: 'test', blurb: 'Pick the next word from four options.', Component: lazy(() => import('./Choice')) },
  { id: 'unscramble', name: 'Unscramble', icon: '🔀', kind: 'test', blurb: 'Tap the jumbled words back into order.', Component: lazy(() => import('./Unscramble')) },
  { id: 'order', name: 'Put in order', icon: '🪜', kind: 'test', blurb: 'Rebuild the sequence of lines or phrases.', Component: lazy(() => import('./Order')) },
  { id: 'spot', name: 'Spot the mistake', icon: '🔎', kind: 'test', blurb: 'One word has been swapped. Find the impostor.', Component: lazy(() => import('./SpotError')) },
  { id: 'flashcards', name: 'Cue cards', icon: '🃏', kind: 'test', blurb: 'See one part and recall the next. Learns the links.', Component: lazy(() => import('./Flashcards')) },
  { id: 'type-all', name: 'Write it out', icon: '📝', kind: 'test', blurb: 'Type the whole thing from memory and see every slip.', Component: lazy(() => import('./TypeAll')) },
  { id: 'recite', name: 'Recite aloud', icon: '🎙️', kind: 'test', blurb: 'Say it out loud. Checked by speech recognition where available.', Component: lazy(() => import('./Recite')) },
]

export const modeById = (id: string) => MODES.find((m) => m.id === id)

/** The research-backed learning path used by "Learn this part". */
export const GUIDED_PATH = ['read', 'initials', 'fade', 'type-initials', 'type-all']
/** What daily review uses: quick, full-recall, works anywhere. */
export const REVIEW_MODE = 'type-initials'
