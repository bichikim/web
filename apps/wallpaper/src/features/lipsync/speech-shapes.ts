import type {LipSyncShape} from '@winter-love/wallpaper/settings/lipsync'

const VOWELS: readonly LipSyncShape[] = [
  'a',
  'e',
  'a',
  'e',
  'o',
  'e',
  'o',
  'e',
  'o',
  'a',
  'e',
  'e',
  'o',
  'u',
  'o',
  'e',
  'i',
  'u',
  'u',
  'i',
  'i',
]
const vowelJamo = Array.from('ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ', (vowel) =>
  vowel.normalize('NFKD'),
)
const onsets = new Set(Array.from('ㅁㅂㅃㅍ', (onset) => onset.normalize('NFKD')))
// Jongseong mieum, bieup, bieup-sios and pieup close the lips.
const finals = new Set(Array.from('ᆷᆸᆹᇁ'))
const letters = new Map<string, LipSyncShape>([
  ['a', 'a'],
  ['i', 'i'],
  ['u', 'u'],
  ['e', 'e'],
  ['o', 'o'],
  ['ㅏ', 'a'],
  ['ㅣ', 'i'],
  ['ㅜ', 'u'],
  ['ㅔ', 'e'],
  ['ㅗ', 'o'],
  ['m', 'closed'],
  ['b', 'closed'],
  ['p', 'closed'],
])
/** Estimates Korean vowel/closure poses from text; these are not forced-alignment timestamps. */
export const speechShapes = (text: string): readonly (LipSyncShape | null)[] =>
  Array.from(text).flatMap((character): (LipSyncShape | null)[] => {
    if (/^[가-힣]$/u.test(character)) {
      const [onset, vowel, final] = Array.from(character.normalize('NFD'))
      return [
        ...(onsets.has(onset!) ? ['closed' as const] : []),
        VOWELS[vowelJamo.indexOf(vowel!)]!,
        ...(finals.has(final!) ? ['closed' as const] : []),
      ]
    }
    return [letters.get(character.toLowerCase()) ?? null]
  })
