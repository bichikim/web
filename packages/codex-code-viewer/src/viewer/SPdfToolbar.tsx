import {STooltip} from './STooltip'
import {useTranslations} from './locale/use-translations'
import {SIcon} from './SIcon'
import {useNumberInput} from './use-number-input'
import type {usePdfDocument} from './use-pdf-document'

interface SPdfToolbarProps {
  onFind?: () => void
  pdf: ReturnType<typeof usePdfDocument>
}
const MIN_PERCENT = 25
const MAX_PERCENT = 400
const ZOOM_STEP = 25

export const SPdfToolbar = (props: SPdfToolbarProps) => {
  const t = useTranslations()
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
      aria-label={t('PDF 표시 방식')}
      class="flex shrink-0 flex-wrap items-center gap-2 border-b border-divider px-4 py-2"
    >
      <div role="group" aria-label={t('PDF 페이지 조절')} class="ui-number-control">
        <STooltip content={t('이전 PDF 페이지')} class="h-full">
          {(description) => (
            <button
              aria-describedby={description}
              aria-label={t('이전 PDF 페이지')}
              class="ui-number-button"
              type="button"
              disabled={props.pdf.page() <= 1}
              onClick={() => props.pdf.turn(props.pdf.page() - 1)}
            >
              <SIcon name="minus" />
            </button>
          )}
        </STooltip>
        <label class="ui-number-field">
          <input
            aria-label={t('PDF 페이지')}
            class="ui-number-input"
            style={{'--number-width': `${pageInput.value().length}ch`}}
            type="number"
            min="1"
            max={props.pdf.pages()}
            disabled={props.pdf.pages() === 0}
            value={pageInput.value()}
            onInput={pageInput.handleInput}
            onBlur={pageInput.handleBlur}
            onKeyDown={pageInput.handleKey}
          />
          <span class="whitespace-nowrap pl-1 tabular-nums">/ {props.pdf.pages()}</span>
        </label>
        <STooltip content={t('다음 PDF 페이지')} class="h-full">
          {(description) => (
            <button
              aria-describedby={description}
              aria-label={t('다음 PDF 페이지')}
              class="ui-number-button"
              type="button"
              disabled={props.pdf.page() >= props.pdf.pages()}
              onClick={() => props.pdf.turn(props.pdf.page() + 1)}
            >
              <SIcon name="add" />
            </button>
          )}
        </STooltip>
      </div>
      <button
        class="ui-document-button"
        type="button"
        aria-pressed={props.pdf.fitting()}
        disabled={props.pdf.pages() === 0}
        onClick={() => props.pdf.fit()}
      >
        {t('화면에 맞춤')}
      </button>
      <div role="group" aria-label={t('PDF 배율 조절')} class="ui-number-control">
        <STooltip content={t('PDF 축소')} class="h-full">
          {(description) => (
            <button
              aria-describedby={description}
              aria-label={t('PDF 축소')}
              class="ui-number-button"
              type="button"
              disabled={props.pdf.pages() === 0 || props.pdf.percent() <= MIN_PERCENT}
              onClick={() => props.pdf.zoom(props.pdf.percent() - ZOOM_STEP)}
            >
              <SIcon name="minus" />
            </button>
          )}
        </STooltip>
        <label class="ui-number-field">
          <input
            aria-label={t('PDF 배율 (%)')}
            class="ui-number-input"
            style={{'--number-width': `${zoomInput.value().length}ch`}}
            type="number"
            min={MIN_PERCENT}
            max={MAX_PERCENT}
            value={zoomInput.value()}
            disabled={props.pdf.pages() === 0}
            onInput={zoomInput.handleInput}
            onBlur={zoomInput.handleBlur}
            onKeyDown={zoomInput.handleKey}
          />
          <span aria-hidden="true">%</span>
        </label>
        <STooltip content={t('PDF 확대')} class="h-full">
          {(description) => (
            <button
              aria-describedby={description}
              aria-label={t('PDF 확대')}
              class="ui-number-button"
              type="button"
              disabled={props.pdf.pages() === 0 || props.pdf.percent() >= MAX_PERCENT}
              onClick={() => props.pdf.zoom(props.pdf.percent() + ZOOM_STEP)}
            >
              <SIcon name="add" />
            </button>
          )}
        </STooltip>
      </div>
      <STooltip content={t('PDF 텍스트 검색')}>
        {(description) => (
          <button
            aria-describedby={description}
            aria-label={t('PDF 텍스트 검색')}
            class="ui-document-button"
            type="button"
            disabled={props.pdf.pages() === 0}
            onClick={() => props.onFind?.()}
          >
            <SIcon name="search" />
            {t('검색')}
          </button>
        )}
      </STooltip>
    </div>
  )
}
