/**
 * Languages a text can be written in. `id` is what is stored in the database
 * (one byte), so never renumber an existing entry; only append.
 */
export interface Language {
  id: number
  code: 'en' | 'fr' | 'gd' | 'de' | 'es'
  name: string
  /** Name in the language itself. */
  native: string
  /** BCP 47 tag for speech synthesis / recognition and Intl APIs. */
  bcp47: string
  /** Gaelic uses leading/trailing apostrophes as part of words ('s, a'). */
  apostropheEdges: boolean
}

export const LANGUAGES: readonly Language[] = [
  { id: 0, code: 'en', name: 'English', native: 'English', bcp47: 'en-GB', apostropheEdges: false },
  { id: 1, code: 'fr', name: 'French', native: 'Français', bcp47: 'fr-FR', apostropheEdges: false },
  { id: 2, code: 'gd', name: 'Scottish Gaelic', native: 'Gàidhlig', bcp47: 'gd-GB', apostropheEdges: true },
  { id: 3, code: 'de', name: 'German', native: 'Deutsch', bcp47: 'de-DE', apostropheEdges: false },
  { id: 4, code: 'es', name: 'Spanish', native: 'Español', bcp47: 'es-ES', apostropheEdges: false },
]

export function languageById(id: number): Language {
  return LANGUAGES.find((l) => l.id === id) ?? LANGUAGES[0]
}

/** How a text is cut into practice chunks. Stored as a small integer. */
export const SPLIT_MODES = [
  { id: 0, name: 'Lines', hint: 'Each line is a chunk (poems, songs, scripts)' },
  { id: 1, name: 'Sentences', hint: 'Each sentence is a chunk (prose, speeches)' },
  { id: 2, name: 'Paragraphs', hint: 'Each blank-line-separated block is a chunk' },
] as const

export const LIMITS = {
  titleChars: 120,
  bodyChars: 50_000,
  /** New texts one IP address may create per hour. */
  createsPerHour: 30,
  /** Edits one IP address may make per hour. */
  editsPerHour: 300,
  /** Texts not opened for this many days and not in anyone's library are deleted. */
  idleDays: 400,
  progressBytes: 64_000,
  libraryItems: 2_000,
}
