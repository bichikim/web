const MEMORY_MEMO_DIALOGUE_PREFIX = 'memory-memo-'

export const getMemoryMemoDialogueId = (memoId: string) => `${MEMORY_MEMO_DIALOGUE_PREFIX}${memoId}`

export const isMemoryMemoDialogueId = (dialogueId: string) =>
  dialogueId.startsWith(MEMORY_MEMO_DIALOGUE_PREFIX)
