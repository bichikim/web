export interface StoryTransition {
  /** Forward and reverse scrolls sweep in opposite directions. */
  readonly direction: 1 | -1
  /** Previously presented chapter, or -1 for the playground. */
  readonly from: number
  /** Change the content at full coverage, then uncover it. */
  readonly phase: 'cover' | 'reveal'
  /** Identity used to discard completion events from an obsolete animation. */
  readonly revision: number
  /** Requested product chapter, or -1 to restore user control. */
  readonly to: number
}

export interface StoryState {
  /** Chapter actually visible behind the moving planes. */
  readonly chapter: number
  /** Accepted chapter; requests received during an animation are discarded. */
  readonly requested: number
  /** Monotonic animation identity, including after completion. */
  readonly revision: number
  /** Null when no prepared sequence is playing. */
  readonly transition: StoryTransition | null
}
