export interface DialoguePromptOptions {
  readonly outputLanguage?: DialogueOutputLanguage
  readonly request: string
}

export type DialogueOutputLanguage = 'en' | 'ja' | 'ko'

const SYSTEM_PROMPTS = {
  en: 'Write a natural English response to the user request.',
  ja: 'ユーザーの依頼に答える自然な日本語を書いてください。',
  ko: '사용자의 요청에 답하는 자연스러운 한국어 본문 한 문단을 쓰세요.',
} as const satisfies Record<DialogueOutputLanguage, string>

export const createDirectAnswerMessages = (
  options: DialoguePromptOptions,
): Array<TextGenerationMessage> => [
  {content: SYSTEM_PROMPTS[options.outputLanguage ?? 'ko'], role: 'system'},
  {
    content: options.request.trim(),
    role: 'user',
  },
]
import type {TextGenerationMessage} from '../text-generation/runtime'
