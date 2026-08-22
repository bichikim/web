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
  return `주제: ${options.topic.trim()}
공백을 포함해 ${length}자에 최대한 가깝게 작성하세요.
결과는 반드시 ${MINIMUM_DIALOGUE_SCRIPT_LENGTH}자 이상 ${MAXIMUM_DIALOGUE_SCRIPT_LENGTH}자 이하로 작성하세요.
제목, 따옴표, 글머리표 없이 실제로 읽을 대사 한 문단만 작성하세요.`
}
