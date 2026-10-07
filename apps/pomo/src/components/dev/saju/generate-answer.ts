import {hasAnswerConflict} from './has-answer-conflict'
import type {GenerateSajuRequest, SajuWorkerResponse} from './messages'

type CompleteResponse = Extract<SajuWorkerResponse, {type: 'complete'}>
type GenerateText = (messages: GenerateSajuRequest['messages']) => Promise<string>

const REWRITE_INSTRUCTION = [
  '다음 사주 풀이 문장만 일반 사용자가 이해할 수 있는 한국어로 고쳐 쓰세요.',
  '비겁은 동료나 경쟁 관계, 식상은 표현과 활동, 재성은 돈과 자원 관리, 관성은 사회적 책임, 인성은 배움과 주변의 도움을 뜻합니다.',
  '답변에는 이 명리학 용어와 기운·에너지·기둥 같은 모호한 표현을 쓰지 마세요.',
  '계산 수치를 바꾸거나 새로운 사실을 더하지 말고, 성격·직업 적성·능력·미래를 확정하는 문장은 삭제하세요.',
  '질문에 대한 답과 쉬운 말로 푼 이유를 첫 문단에 쓰고, “예를 들면”으로 시작하는 가상의 일상 장면과 알 수 없는 점을 다음 문단에 쓰세요. 짧은 문단 2~3개로 나누세요.',
  '가상 장면을 이 사람의 실제 행동이라고 말하지 마세요. 설명 없이 고친 문장만 출력하세요.',
].join(' ')
const READABLE_EXAMPLE_PATTERN = /예를 들면/u
const INTERPRETATION_LIMIT_PATTERN = /단정할 수(?:는)? 없|알 수(?:는)? 없|뜻은 아니/u

function isUsableAnswer(answer: string, request: GenerateSajuRequest): boolean {
  return (
    answer.length > 0 &&
    !hasAnswerConflict(answer, request.facts) &&
    READABLE_EXAMPLE_PATTERN.test(answer) &&
    INTERPRETATION_LIMIT_PATTERN.test(answer)
  )
}

function formatAnswerParagraphs(answer: string): string {
  return /\n\s*\n/u.test(answer) ? answer : answer.replace(/\s+(?=예를 들면)/u, '\n\n')
}

/** Returns a checked model answer or a calculated explanation. */
export async function generateSajuAnswer(
  request: GenerateSajuRequest,
  generateText: GenerateText,
): Promise<CompleteResponse> {
  const firstAnswer = await generateText(request.messages)
  if (isUsableAnswer(firstAnswer, request)) {
    return {source: 'model', text: formatAnswerParagraphs(firstAnswer), type: 'complete'}
  }

  const rewriteMessages: GenerateSajuRequest['messages'] = [
    {content: REWRITE_INSTRUCTION, role: 'system'},
    {content: firstAnswer, role: 'user'},
  ]
  const rewriteAnswer = await generateText(rewriteMessages)
  if (isUsableAnswer(rewriteAnswer, request)) {
    return {source: 'model', text: formatAnswerParagraphs(rewriteAnswer), type: 'complete'}
  }

  if (request.fallbackAnswer !== null) {
    return {source: 'calculation', text: request.fallbackAnswer, type: 'complete'}
  }

  throw new Error(
    '생성된 풀이가 계산 정보나 표현 기준에 맞지 않아 표시하지 않았어요. 다시 시도해 주세요.',
  )
}
