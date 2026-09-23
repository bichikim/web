import {For, Show} from 'solid-js'
import {type ExpenseForm} from '../expense'
import {BUTTON_CLASSES} from './button-classes'

const formatWon = (amount: number) => `${new Intl.NumberFormat('ko-KR').format(amount)}원`

interface ExpenseResultProps {
  readonly form: ExpenseForm
  readonly isApplied: boolean
  readonly isApplying: boolean
  readonly onApply: () => void
}

export function ExpenseResult(props: ExpenseResultProps) {
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
