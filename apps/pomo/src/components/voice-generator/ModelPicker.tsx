import {cx} from 'class-variance-authority'
import {For} from 'solid-js'
import {SUPERTONIC_MODELS, type SupertonicModelId} from '../../features/supertonic/index'

const BYTES_PER_MEGABYTE = 1_000_000

const formatModelSize = (size: number) => `${Math.round(size / BYTES_PER_MEGABYTE)}MB`

interface ModelPickerProps {
  readonly disabled: boolean
  readonly onModelChange: (modelId: SupertonicModelId) => void
  readonly selectedModelId: SupertonicModelId
}

export const ModelPicker = (props: ModelPickerProps) => (
  <fieldset class="grid gap-2.5 border-0 p-0">
    <legend class="mb-2.5 text-sm font-650 text-#eee5ef">모델 타입</legend>
    <div class="grid grid-cols-2 gap-3">
      <For each={SUPERTONIC_MODELS}>
        {(model) => {
          const isSelected = () => props.selectedModelId === model.id

          return (
            <button
              aria-pressed={isSelected()}
              class={cx(
                'grid gap-1 rounded-4 border p-4 text-left transition',
                isSelected()
                  ? 'border-#f2a7b8/65 bg-#f2a7b8/10'
                  : 'border-white/8 bg-white/3 hover:bg-white/6',
                'disabled:cursor-not-allowed disabled:opacity-40',
              )}
              disabled={props.disabled}
              onClick={() => props.onModelChange(model.id)}
              type="button"
            >
              <span class="flex items-center justify-between gap-2 text-sm font-700 text-#f8edf1">
                {model.label}
                <span class="text-xs font-500 text-#bdb2c4">{formatModelSize(model.size)}</span>
              </span>
              <span class="text-xs leading-5 text-#8f8297">{model.description}</span>
            </button>
          )
        }}
      </For>
    </div>
  </fieldset>
)
