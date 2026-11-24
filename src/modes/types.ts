import type { Chunk } from '../lib/text'
import type { Settings } from '../lib/store'

export interface ModeProps {
  chunks: Chunk[]
  lang: number
  /** BCP 47 tag of the text's language. */
  bcp47: string
  paragraphs: boolean
  settings: Settings
  /**
   * Finish the exercise. `scores` holds one 0..1 accuracy per chunk for
   * retrieval modes (these update the spaced-repetition schedule); `null`
   * for study modes that only expose you to the text. A `null` entry means
   * that chunk wasn't tested this time.
   */
  onDone: (scores: (number | null)[] | null) => void
}
