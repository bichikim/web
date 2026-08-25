export const MINIMUM_DIALOGUE_SCRIPT_LENGTH = 50
export const MAXIMUM_DIALOGUE_SCRIPT_LENGTH = 300
export const DEFAULT_DIALOGUE_SCRIPT_LENGTH = 120

export interface CreateDialogueScriptRequestOptions {
  readonly length: number
  readonly topic: string
}

const clampLength = (length: number) =>
  Math.min(
    MAXIMUM_DIALOGUE_SCRIPT_LENGTH,
    Math.max(MINIMUM_DIALOGUE_SCRIPT_LENGTH, Math.round(length)),
  )

/** Creates the user request for a short spoken Korean script. */
export const createDialogueScriptRequest = (options: CreateDialogueScriptRequestOptions) => {
  const length = clampLength(options.length)
  return `사용자 요청: ${options.topic.trim()}
생성 분량: ${length}자`
}
