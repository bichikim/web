export interface DialoguePromptOptions {
  readonly request: string
}

const SYSTEM_PROMPT = '사용자의 요청에 답하는 자연스러운 한국어 본문 한 문단을 쓰세요.'

export const createDirectAnswerMessages = (
  options: DialoguePromptOptions,
): Array<TextGenerationMessage> => [
  {content: SYSTEM_PROMPT, role: 'system'},
  {
    content: options.request.trim(),
    role: 'user',
  },
]
import type {TextGenerationMessage} from '../text-generation/runtime'
