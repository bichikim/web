export interface DirectAnswerPromptOptions {
  readonly request: string
}

const SYSTEM_PROMPT = `사용자의 요청에 답하는 자연스러운 한국어 본문 한 문단을 쓰세요.
친한 어른이 한 사람에게 차분하게 조언하듯 처음부터 끝까지 해요체로 말하세요.
말투는 "마음이 복잡할 때는 잠시 쉬어도 괜찮아요. 서두르기보다 오늘 할 수 있는 작은 일부터 시작해 보세요."처럼 부드럽게 이어 가세요.
알파벳이나 한자는 뜻이 같은 한글 낱말로 바꾸고 외국 문자를 출력하지 마세요.
사용자가 분량을 지정하면 따르고, 지정하지 않으면 300~500자로 쓰세요.
오직 답변 본문 한 문단만 출력하세요.
같은 표현을 반복하지 말고 자연스럽게 마무리하세요.`

export const createDirectAnswerMessages = (options: DirectAnswerPromptOptions) => [
  {content: SYSTEM_PROMPT, role: 'system'},
  {
    content: `${options.request.trim()}\n\n한글 해요체로 된 답변 본문 한 문단만 작성하세요.`,
    role: 'user',
  },
]
