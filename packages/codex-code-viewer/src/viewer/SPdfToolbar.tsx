import {SIcon} from './SIcon'
import {useNumberInput} from './use-number-input'
import type {usePdfDocument} from './use-pdf-document'

interface SPdfToolbarProps {
  onFind?: () => void
  pdf: ReturnType<typeof usePdfDocument>
}
const inputClasses = [
  'min-w-0 bg-transparent p-0 text-right outline-none [appearance:textfield]',
  '[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
].join(' ')
const buttonClasses = [
  'ui-focus ui-transition inline-flex shrink-0 items-center justify-center bg-transparent p-0',
  'enabled:hover:bg-control-hover enabled:active:bg-control-pressed focus-visible:outline-offset-[-2px]',
].join(' ')
const groupClasses = [
  'ui-document-control inline-flex shrink-0 items-center rounded-pill',
  'border border-divider bg-canvas text-sm shadow-control',
].join(' ')
const MIN_PERCENT = 25
const MAX_PERCENT = 400
const ZOOM_STEP = 25

export const SPdfToolbar = (props: SPdfToolbarProps) => {
  const pageInput = useNumberInput({
    onCommit: (value) => props.pdf.turn(value),
    value: () => props.pdf.page(),
  })
  const zoomInput = useNumberInput({
    onCommit: (value) => props.pdf.zoom(value),
    value: () => props.pdf.percent(),
  })
  return (
    <div
      aria-label="PDF 표시 방식"
      class="flex shrink-0 flex-wrap items-center gap-2 border-b border-divider px-4 py-2"
    >
      <div role="group" aria-label="PDF 페이지 조절" class={groupClasses}>
        <button
          aria-label="이전 PDF 페이지"
          class={`${buttonClasses} h-full w-7 rounded-l-pill border-r border-divider`}
          type="button"
          disabled={props.pdf.page() <= 1}
          onClick={() => props.pdf.turn(props.pdf.page() - 1)}
        >
          <SIcon name="minus" />
        </button>
        <label class="flex items-center gap-1 px-2">
          <input
            aria-label="PDF 페이지"
            class={`w-8 ${inputClasses}`}
            type="number"
            min="1"
            max={props.pdf.pages()}
            disabled={props.pdf.pages() === 0}
            value={pageInput.value()}
            onInput={pageInput.handleInput}
            onBlur={pageInput.handleBlur}
            onKeyDown={pageInput.handleKey}
          />
          <span class="whitespace-nowrap text-muted">/ {props.pdf.pages()}</span>
        </label>
        <button
          aria-label="다음 PDF 페이지"
          class={`${buttonClasses} h-full w-7 rounded-r-pill border-l border-divider`}
          type="button"
          disabled={props.pdf.page() >= props.pdf.pages()}
          onClick={() => props.pdf.turn(props.pdf.page() + 1)}
        >
          <SIcon name="add" />
        </button>
      </div>
      <button
        class="ui-document-button"
        type="button"
        aria-pressed={props.pdf.fitting()}
        disabled={props.pdf.pages() === 0}
        onClick={() => props.pdf.fit()}
      >
        화면에 맞춤
      </button>
      <div role="group" aria-label="PDF 배율 조절" class={groupClasses}>
        <label class="flex items-center gap-1 pl-3 pr-2">
          <input
            aria-label="PDF 배율 (%)"
            class={`w-10 ${inputClasses}`}
            type="number"
            min={MIN_PERCENT}
            max={MAX_PERCENT}
            value={zoomInput.value()}
            disabled={props.pdf.pages() === 0}
            onInput={zoomInput.handleInput}
            onBlur={zoomInput.handleBlur}
            onKeyDown={zoomInput.handleKey}
          />
          <span class="text-muted">%</span>
        </label>
        <div class="flex h-full w-7 flex-col border-l border-divider [--icon-size:12px]">
          <button
            aria-label="PDF 확대"
            class={`${buttonClasses} min-h-0 flex-1 rounded-tr-pill border-b border-divider`}
            type="button"
            disabled={props.pdf.pages() === 0 || props.pdf.percent() >= MAX_PERCENT}
            onClick={() => props.pdf.zoom(props.pdf.percent() + ZOOM_STEP)}
          >
            <SIcon name="add" />
          </button>
          <button
            aria-label="PDF 축소"
            class={`${buttonClasses} min-h-0 flex-1 rounded-br-pill`}
            type="button"
            disabled={props.pdf.pages() === 0 || props.pdf.percent() <= MIN_PERCENT}
            onClick={() => props.pdf.zoom(props.pdf.percent() - ZOOM_STEP)}
          >
            <SIcon name="minus" />
          </button>
        </div>
      </div>
      <button
        aria-label="PDF 텍스트 검색"
        class="ui-document-button"
        type="button"
        disabled={props.pdf.pages() === 0}
        onClick={() => props.onFind?.()}
      >
        <SIcon name="search" /> 검색
      </button>
    </div>
  )
}
