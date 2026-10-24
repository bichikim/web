export interface RollbackLanguageLearningDialoguesOptions {
  readonly deleteDialogue: (dialogueId: string) => Promise<void>
  readonly dialogueIds: ReadonlyArray<string>
}

export const rollbackLanguageLearningDialogues = async (
  options: RollbackLanguageLearningDialoguesOptions,
): Promise<ReadonlyArray<unknown>> => {
  const results = await Promise.allSettled(
    options.dialogueIds.map(async (dialogueId) => options.deleteDialogue(dialogueId)),
  )

  return results.flatMap((result) => (result.status === 'rejected' ? [result.reason] : []))
}
