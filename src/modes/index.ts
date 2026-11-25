import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import {
  ALargeSmall, BookOpen, EyeOff, Keyboard, Layers, ListOrdered, Mic, NotebookPen,
  PencilLine, SearchCheck, Shuffle, SquareStack, Target, type LucideIcon,
} from 'lucide-react'
import type { ModeProps } from './types'

export interface ModeInfo {
  id: string
  name: string
  icon: LucideIcon
  blurb: string
  /** One-line instructions shown at the top of the exercise. */
  howto: string
  /** Study modes expose you to the text; test modes grade you and schedule reviews. */
  kind: 'study' | 'test'
  /** Where it's listed: study aids, serious recall, or quicker games. */
  group: 'study' | 'recall' | 'game'
  Component: LazyExoticComponent<ComponentType<ModeProps>>
  /** Needs more than one unit to make sense. */
  minChunks?: number
}

export const MODES: ModeInfo[] = [
  { id: 'read', name: 'Read & listen', icon: BookOpen, kind: 'study', group: 'study', howto: 'Read it aloud slowly, or press play and follow along. Tap any part to hear it again.', blurb: 'Read it through, or hear it read aloud line by line.', Component: lazy(() => import('./Read')) },
  { id: 'initials', name: 'First letters', icon: ALargeSmall, kind: 'study', group: 'study', howto: "Say each word to yourself from its first letter. Tap a word to peek if you're stuck.", blurb: 'Only the first letter of each word. Say the rest in your head.', Component: lazy(() => import('./FirstLetters')) },
  { id: 'fade', name: 'Fade out', icon: EyeOff, kind: 'study', group: 'study', howto: 'Say the whole passage through, then hide more words. Tap a hidden word to peek.', blurb: 'Words vanish step by step until none are left.', Component: lazy(() => import('./Fade')) },
  { id: 'type-initials', name: 'Type first letters', icon: Keyboard, kind: 'test', group: 'recall', howto: 'Type the first letter of each word, in order. Two wrong tries and the word is shown.', blurb: 'Type the first letter of every word from memory. Fast on a phone.', Component: lazy(() => import('./TypeInitials')) },
  { id: 'buildup', name: 'Build up', icon: Layers, kind: 'test', group: 'recall', howto: 'Read the new part, then type the first letters of everything from the start.', blurb: 'Add one part at a time and recall from the start each round.', Component: lazy(() => import('./BuildUp')) },
  { id: 'blanks', name: 'Fill the blanks', icon: PencilLine, kind: 'test', group: 'game', howto: 'Fill in each gap. Press Enter or Space to jump to the next one.', blurb: 'Type in the missing words. Choose how many go.', Component: lazy(() => import('./Blanks')) },
  { id: 'choice', name: 'What comes next?', icon: Target, kind: 'test', group: 'game', howto: 'Pick the word that comes next.', blurb: 'Pick the next word from four options.', Component: lazy(() => import('./Choice')) },
  { id: 'unscramble', name: 'Unscramble', icon: Shuffle, kind: 'test', group: 'game', howto: 'Tap the words in the right order to rebuild each line.', blurb: 'Tap the jumbled words back into order.', Component: lazy(() => import('./Unscramble')) },
  { id: 'order', name: 'Put in order', icon: ListOrdered, kind: 'test', group: 'game', howto: 'Tap the parts in the order they come in the text.', blurb: 'Rebuild the sequence of lines or phrases.', Component: lazy(() => import('./Order')) },
  { id: 'spot', name: 'Spot the mistake', icon: SearchCheck, kind: 'test', group: 'game', howto: 'One word may have been swapped. Tap it, or say the line is correct.', blurb: 'One word has been swapped. Find the impostor.', Component: lazy(() => import('./SpotError')) },
  { id: 'flashcards', name: 'Cue cards', icon: SquareStack, kind: 'test', group: 'recall', howto: 'Recall the part that comes next, reveal it, then mark yourself honestly.', blurb: 'See one part and recall the next. Learns the links.', Component: lazy(() => import('./Flashcards')) },
  { id: 'type-all', name: 'Write it out', icon: NotebookPen, kind: 'test', group: 'recall', howto: "Write the whole passage from memory. Punctuation and capitals don't matter.", blurb: 'Type the whole thing from memory and see every slip.', Component: lazy(() => import('./TypeAll')) },
  { id: 'recite', name: 'Recite aloud', icon: Mic, kind: 'test', group: 'recall', howto: 'Say the passage aloud from memory. Where your browser can listen, it checks you.', blurb: 'Say it out loud. Checked by speech recognition where available.', Component: lazy(() => import('./Recite')) },
]

export const modeById = (id: string) => MODES.find((m) => m.id === id)

/** The research-backed learning path used by "Learn this part". */
export const GUIDED_PATH = ['read', 'initials', 'fade', 'type-initials', 'type-all']
/** What daily review uses: quick, full-recall, works anywhere. */
export const REVIEW_MODE = 'type-initials'
