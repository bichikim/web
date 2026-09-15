/** Policy used when newer delayed dialogue events replace older pending work. */
export type DialogueSequenceReplacementPolicy = 'latest'

// oxlint-disable-next-line eslint/no-magic-numbers -- Bound for latest delayed dialogue replacement.
export const MAX_LATEST_REPLACEMENT_DIALOGUE_IDS = 32 as const
