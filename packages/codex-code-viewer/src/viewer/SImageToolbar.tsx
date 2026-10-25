import {STooltip} from './STooltip'
import {useTranslations} from './locale/use-translations'
import {SIcon} from './SIcon'
import {useNumberInput} from './use-number-input'
import type {useImageView} from './use-image-view'

interface SImageToolbarProps {
  image: Pick<
    ReturnType<typeof useImageView>,
    'fit' | 'fitting' | 'loaded' | 'maximum' | 'minimum' | 'percent' | 'zoom'
  >
  onZoomIn: () => void
  onZoomOut: () => void
}
export const SImageToolbar = (props: SImageToolbarProps) => {
  const t = useTranslations()
  const input = useNumberInput({
    onCommit: (value) => {
      if (value > 0) {
        props.image.zoom(value)
      }
    },
    value: () => props.image.percent(),
  })
  return (
    <div
      aria-label={t('이미지 표시 방식')}
      class="flex shrink-0 flex-wrap items-center gap-2 border-b border-divider px-4 py-2"
    >
      <button
        class="ui-document-button"
        aria-pressed={props.image.fitting()}
        onClick={() => props.image.fit()}
        type="button"
      >
        {t('화면에 맞춤')}
      </button>
      <div role="group" aria-label={t('이미지 배율 조절')} class="ui-number-control">
        <STooltip content={t('이미지 축소')} class="h-full">
          {(description) => (
            <button
              aria-describedby={description}
              aria-label={t('이미지 축소')}
              class="ui-number-button"
              disabled={!props.image.loaded() || props.image.percent() <= props.image.minimum}
              onClick={() => props.onZoomOut()}
              type="button"
            >
              <SIcon name="minus" />
            </button>
          )}
        </STooltip>
        <label class="ui-number-field">
          <input
            aria-label={t('이미지 배율 (%)')}
            class="ui-number-input"
            style={{'--number-width': `${input.value().length}ch`}}
            type="number"
            inputmode="decimal"
            min={props.image.minimum}
            max={props.image.maximum}
            step="0.1"
            value={input.value()}
            disabled={!props.image.loaded()}
            onInput={input.handleInput}
            onBlur={input.handleBlur}
            onKeyDown={input.handleKey}
          />
          <span aria-hidden="true">%</span>
        </label>
        <STooltip content={t('이미지 확대')} class="h-full">
          {(description) => (
            <button
              aria-describedby={description}
              aria-label={t('이미지 확대')}
              class="ui-number-button"
              disabled={!props.image.loaded() || props.image.percent() >= props.image.maximum}
              onClick={() => props.onZoomIn()}
              type="button"
            >
              <SIcon name="add" />
            </button>
          )}
        </STooltip>
      </div>
    </div>
  )
}
