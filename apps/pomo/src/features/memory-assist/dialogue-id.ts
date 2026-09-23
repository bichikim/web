const MEMORY_MEMO_DIALOGUE_PREFIX = 'memory-memo-'

export const getMemoryMemoDialogueId = (memoId: string) => `${MEMORY_MEMO_DIALOGUE_PREFIX}${memoId}`

export const isMemoryMemoDialogueId = (dialogueId: string) =>
  dialogueId.startsWith(MEMORY_MEMO_DIALOGUE_PREFIX)

/** Recognizes legacy and generation-specific dialogue IDs owned by one memo. */
export const isMemoryMemoOwnedDialogue = (dialogueId: string, memoId: string) => {
  const prefix = getMemoryMemoDialogueId(memoId)
  if (dialogueId === prefix) {
    return true
  }

  return (
    dialogueId.startsWith(`${prefix}:`) &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(
      dialogueId.slice(prefix.length + 1),
    )
  )
}
