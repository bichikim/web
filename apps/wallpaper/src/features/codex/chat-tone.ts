const TONES = ['blue', 'teal', 'violet', 'rose', 'amber', 'sky'] as const
export type ChatTone = (typeof TONES)[number]
const OFFSET = 0
const PRIME = 31
const MODULUS = 4_294_967_296

/** Assigns a stable accent to a chat independent of its title, activity, and stack position. */
export const chatTone = (session: string): ChatTone => {
  const hash = Array.from(session).reduce(
    (value, character) => (value * PRIME + character.charCodeAt(0)) % MODULUS,
    OFFSET,
  )
  return TONES[hash % TONES.length]
}
