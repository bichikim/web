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
const inputClasses = [
  'w-12 min-w-0 bg-transparent p-0 text-right outline-none [appearance:textfield]',
  '[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
].join(' ')
export const SImageToolbar = (props: SImageToolbarProps) => {
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
      aria-label="이미지 표시 방식"
      class="flex shrink-0 flex-wrap items-center gap-2 border-b border-divider px-4 py-2"
    >
      <button
        class="ui-document-button"
        aria-pressed={props.image.fitting()}
        onClick={() => props.image.fit()}
        type="button"
      >
        화면에 맞춤
      </button>
      <div class="flex items-center gap-1">
        <button
          aria-label="이미지 축소"
          class="ui-document-button aspect-square px-0"
          disabled={!props.image.loaded() || props.image.percent() <= props.image.minimum}
          onClick={() => props.onZoomOut()}
          type="button"
        >
          <SIcon name="minus" />
        </button>
        <label class="ui-field ui-document-control gap-1 text-sm">
          <input
            aria-label="이미지 배율 (%)"
            class={inputClasses}
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
          <span class="text-muted">%</span>
        </label>
        <button
          aria-label="이미지 확대"
          class="ui-document-button aspect-square px-0"
          disabled={!props.image.loaded() || props.image.percent() >= props.image.maximum}
          onClick={() => props.onZoomIn()}
          type="button"
        >
          <SIcon name="add" />
        </button>
      </div>
    </div>
  )
}
