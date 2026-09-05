import {cx} from 'class-variance-authority'
import {createEffect, createSignal, For, Show} from 'solid-js'

import {useChat} from '../../../features/chat'
import {type ExpenseForm, parseExpenseAssistantResponse, parseExpenseText} from './expense'

const EXPENSE_PROMPT = `가계부 원문을 양식 필드에 넣을 데이터로 변환하세요.
JSON 한 줄만 출력하세요. 설명, 마크다운, 코드 블록은 쓰지 마세요.
형식: {"date":null,"questions":[],"items":[{"name":"당근","unitPrice":2000,"quantity":1}]}
가격은 숫자, 수량은 숫자로 쓰고, 합계와 금액은 출력하지 마세요.
단가인지 합계인지 확실하지 않은 금액이 있으면 questions에 확인 질문을 넣으세요.
날짜가 없으면 date는 null로 두세요.`

const PANEL_CLASSES = cx('grid gap-5 rounded-6 border border-white/8 bg-white/4 p-5')
const BUTTON_CLASSES = cx(
  'inline-flex min-h-10 items-center justify-center rounded-3 border border-white/12 px-3',
  'text-sm font-700 text-#f8edf1 transition hover:border-#f2a7b8/45 hover:bg-white/8',
  'disabled:cursor-not-allowed disabled:opacity-45',
)
const PRIMARY_BUTTON_CLASSES = cx(
  BUTTON_CLASSES,
  'border-#f2a7b8/35 bg-#f2a7b8/12 text-#ffc0ce hover:bg-#f2a7b8/20',
)
const INPUT_CLASSES = cx(
  'min-h-32 w-full resize-y rounded-4 border border-white/10 bg-#17131f/70 p-4',
  'text-sm leading-6 text-#f8edf1 outline-none placeholder:text-#8f8297 focus:border-#f2a7b8/55',
)

const formatWon = (amount: number) => `${new Intl.NumberFormat('ko-KR').format(amount)}원`

export interface HwpExpenseAssistantProps {
  readonly onApply: (form: ExpenseForm) => Promise<void> | void
}

interface ExpenseResultProps {
  readonly form: ExpenseForm
  readonly isApplied: boolean
  readonly isApplying: boolean
  readonly onApply: () => void
}

function ExpenseResult(props: ExpenseResultProps) {
  return (
    <section
      class="grid gap-4 rounded-4 border border-white/8 bg-#17131f/55 p-4"
      aria-live="polite"
    >
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h3 class="m-0 text-base font-750">해석 결과</h3>
        <span class="text-sm font-750 text-#f4d7b5">합계 {formatWon(props.form.total)}</span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full min-w-120 border-collapse text-left text-sm">
          <thead class="text-xs text-#8f8297">
            <tr>
              <th class="border-b border-white/8 px-2 py-2 font-650">품목</th>
              <th class="border-b border-white/8 px-2 py-2 text-right font-650">단가</th>
              <th class="border-b border-white/8 px-2 py-2 text-right font-650">수량</th>
              <th class="border-b border-white/8 px-2 py-2 text-right font-650">금액</th>
            </tr>
          </thead>
          <tbody>
            <For each={props.form.items}>
              {(item) => (
                <tr>
                  <td class="border-b border-white/6 px-2 py-2 text-#f8edf1">{item.name}</td>
                  <td class="border-b border-white/6 px-2 py-2 text-right text-#d9cbd7">
                    {formatWon(item.unitPrice)}
                  </td>
                  <td class="border-b border-white/6 px-2 py-2 text-right text-#d9cbd7">
                    {item.quantity}
                  </td>
                  <td class="border-b border-white/6 px-2 py-2 text-right text-#d9cbd7">
                    {formatWon(item.amount)}
                  </td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>
      <Show when={props.form.questions.length > 0}>
        <div class="grid gap-1 rounded-3 bg-#f4d7b5/8 p-3 text-sm text-#f4d7b5">
          <strong>확인이 필요한 내용</strong>
          <For each={props.form.questions}>{(question) => <span>· {question}</span>}</For>
        </div>
      </Show>
      <div class="flex flex-wrap items-center gap-3">
        <button
          class={BUTTON_CLASSES}
          disabled={props.isApplying || props.form.questions.length > 0}
          onClick={() => props.onApply()}
          type="button"
        >
          {props.isApplying ? '양식에 적용 중…' : '양식 필드에 적용'}
        </button>
        <Show when={props.isApplied}>
          <span class="text-sm text-#b8e0c0" role="status">
            양식 필드에 적용했어요.
          </span>
        </Show>
      </div>
    </section>
  )
}

export default function HwpExpenseAssistant(props: HwpExpenseAssistantProps) {
  const chat = useChat({modelId: 'gemma-4-e2b'})
  const [inputText, setInputText] = createSignal('당근 2000원\n고구마 1000원 2개')
  const [expenseForm, setExpenseForm] = createSignal<ExpenseForm | null>(null)
  const [parseError, setParseError] = createSignal<string | null>(null)
  const [isApplying, setIsApplying] = createSignal(false)
  const [isApplied, setIsApplied] = createSignal(false)
  let processedMessageId: string | null = null

  createEffect(() => {
    const messages = chat.messages()
    const latestMessage = messages.at(-1)
    if (latestMessage === undefined || latestMessage.role !== 'assistant') {
      return
    }
    if (latestMessage.id === processedMessageId) {
      return
    }

    processedMessageId = latestMessage.id
    const result = parseExpenseAssistantResponse(latestMessage.content)
    if (result.ok) {
      setExpenseForm(result.value)
      setParseError(null)
      setIsApplied(false)
      return
    }

    const userMessage = [...messages].reverse().find((message) => message.role === 'user')
    const fallbackResult = parseExpenseText(userMessage?.content ?? inputText())
    if (fallbackResult.ok) {
      setExpenseForm(fallbackResult.value)
      setParseError(null)
      setIsApplied(false)
      return
    }

    setExpenseForm(null)
    setParseError('AI 응답을 가계부 항목으로 읽지 못했어요. 다시 시도해 주세요.')
  })

  const handleInterpret = () => {
    const text = inputText().trim()
    if (!chat.isModelReady() || chat.isBusy() || text.length === 0) {
      return
    }

    setExpenseForm(null)
    setParseError(null)
    setIsApplied(false)
    chat.setDraft(text)
    chat.send({refineAnswer: false, supplementaryContext: EXPENSE_PROMPT})
  }

  const handleApply = async () => {
    const form = expenseForm()
    if (form === null || form.questions.length > 0 || isApplying()) {
      return
    }

    setIsApplying(true)
    setParseError(null)
    try {
      await props.onApply(form)
      setIsApplied(true)
    } catch (error) {
      const detail = error instanceof Error && error.message.length > 0 ? ` (${error.message})` : ''
      setParseError(`양식 필드에 적용하지 못했어요.${detail}`)
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <section class={PANEL_CLASSES} aria-labelledby="expense-assistant-heading">
      <div>
        <p class="m-0 text-xs font-750 tracking-[0.2em] text-#f2a7b8 uppercase">
          Local AI · Form fill
        </p>
        <h2 class="mb-0 mt-3 text-xl font-750" id="expense-assistant-heading">
          채팅으로 가계부 양식 채우기
        </h2>
        <p class="mb-0 mt-2 text-sm leading-6 text-#aaa0b1">
          자연어로 쓴 지출을 항목·단가·수량으로 해석한 뒤, 확인한 데이터만 양식에 적용합니다.
        </p>
      </div>

      <label class="grid gap-2 text-sm font-650 text-#d9cbd7" for="expense-input">
        가계부 입력
        <textarea
          class={INPUT_CLASSES}
          id="expense-input"
          onInput={(event) => setInputText(event.currentTarget.value)}
          placeholder="예: 당근 2000원&#10;고구마 1000원 2개"
          value={inputText()}
        />
      </label>

      <div class="flex flex-wrap items-center gap-3">
        <Show
          fallback={
            <button
              class={PRIMARY_BUTTON_CLASSES}
              disabled={chat.isBusy() || !chat.isModelReady() || inputText().trim().length === 0}
              onClick={handleInterpret}
              type="button"
            >
              {chat.isBusy() ? 'AI가 읽는 중…' : 'AI로 가계부 읽기'}
            </button>
          }
          when={chat.canPrepare()}
        >
          <button class={PRIMARY_BUTTON_CLASSES} onClick={chat.prepare} type="button">
            로컬 AI 준비하기
          </button>
        </Show>
        <span class="text-xs text-#8f8297" aria-live="polite">
          {chat.statusMessage()}
        </span>
      </div>

      <Show when={parseError()}>
        {(message) => (
          <p
            class="m-0 rounded-3 border border-#ff8e9f/20 bg-#ff8e9f/8 px-3 py-2 text-sm text-#ffc0ce"
            role="alert"
          >
            {message()}
          </p>
        )}
      </Show>

      <Show when={expenseForm()}>
        {(form) => (
          <ExpenseResult
            form={form()}
            isApplied={isApplied()}
            isApplying={isApplying()}
            onApply={handleApply}
          />
        )}
      </Show>
    </section>
  )
}
