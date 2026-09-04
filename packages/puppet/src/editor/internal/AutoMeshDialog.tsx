import {Dialog} from '@kobalte/core/dialog'
import {createEffect, createSignal, For, Show} from 'solid-js'

import {type AutoMeshSettings, getMinimumAutoMeshCellSize} from '../auto-mesh-part'
import {useEditorPortalMount} from './EditorPortalProvider'

type AutoMeshPreset = 'balanced' | 'custom' | 'detailed' | 'flexible'

interface AutoMeshPresetOption {
  readonly description: string
  readonly divisions: number
  readonly label: string
  readonly value: Exclude<AutoMeshPreset, 'custom'>
}

const PRESET_OPTIONS: ReadonlyArray<AutoMeshPresetOption> = [
  {
    description: '일반적인 파트에 맞는 균형 잡힌 밀도',
    divisions: 12,
    label: '표준',
    value: 'balanced',
  },
  {
    description: '눈썹·입처럼 작은 변형을 위한 세밀한 밀도',
    divisions: 18,
    label: '작은 변형',
    value: 'detailed',
  },
  {
    description: '머리카락처럼 크게 휘는 파트를 위한 촘촘한 밀도',
    divisions: 24,
    label: '큰 변형',
    value: 'flexible',
  },
]
const DEFAULT_GRID_DIVISIONS = 12
const DEFAULT_ALPHA_THRESHOLD = 16

export interface AutoMeshDialogProps {
  readonly errorMessage?: string
  readonly isOpen?: boolean
  readonly onGenerate?: (settings: AutoMeshSettings) => boolean | Promise<boolean>
  readonly onOpenChange?: (open: boolean) => void
  readonly partName?: string
  readonly textureHeight?: number
  readonly textureWidth?: number
}

const getPresetCellSize = (preset: Exclude<AutoMeshPreset, 'custom'>, maximumSize: number) => {
  const option = PRESET_OPTIONS.find((candidate) => candidate.value === preset)
  return Math.max(1, Math.ceil(maximumSize / (option?.divisions ?? DEFAULT_GRID_DIVISIONS)))
}

interface AutoMeshDialogFooterProps {
  readonly canGenerate: boolean
  readonly isGenerating: boolean
}

const AutoMeshDialogFooter = (props: AutoMeshDialogFooterProps) => (
  <footer>
    <Dialog.CloseButton aria-label="취소" class="secondary">
      취소
    </Dialog.CloseButton>
    <button disabled={props.isGenerating || !props.canGenerate} type="submit">
      {props.isGenerating ? '생성 중…' : '자동 메시 생성'}
    </button>
  </footer>
)

export const AutoMeshDialog = (props: AutoMeshDialogProps) => {
  const portalMount = useEditorPortalMount()
  const [preset, setPreset] = createSignal<AutoMeshPreset>('balanced')
  const [cellSize, setCellSize] = createSignal(1)
  const [alphaThreshold, setAlphaThreshold] = createSignal(DEFAULT_ALPHA_THRESHOLD)
  const [isGenerating, setIsGenerating] = createSignal(false)
  const maximumSize = () => Math.max(props.textureWidth ?? 1, props.textureHeight ?? 1)
  const minimumCellSize = () =>
    getMinimumAutoMeshCellSize(props.textureWidth ?? 1, props.textureHeight ?? 1)
  const getOnGenerate = () => props.onGenerate

  createEffect(() => {
    if (props.isOpen) {
      setPreset('balanced')
      setCellSize(getPresetCellSize('balanced', maximumSize()))
      setAlphaThreshold(DEFAULT_ALPHA_THRESHOLD)
      setIsGenerating(false)
    }
  })

  const handlePresetChange = (value: string) => {
    const nextPreset = PRESET_OPTIONS.find((option) => option.value === value)?.value

    if (nextPreset !== undefined) {
      setPreset(nextPreset)
      setCellSize(getPresetCellSize(nextPreset, maximumSize()))
    }
  }

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault()
    const onGenerate = getOnGenerate()

    if (onGenerate === undefined || isGenerating()) {
      return
    }

    setIsGenerating(true)

    try {
      const generated = await onGenerate({
        alphaThreshold: alphaThreshold(),
        cellSize: cellSize(),
      })

      if (generated) {
        props.onOpenChange?.(false)
      }
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Dialog modal open={props.isOpen ?? false} onOpenChange={props.onOpenChange}>
      <Dialog.Portal mount={portalMount}>
        <Dialog.Overlay class="auto-mesh-dialog-overlay" />
        <Dialog.Content aria-busy={isGenerating()} class="auto-mesh-dialog-content">
          <form onSubmit={handleSubmit}>
            <header>
              <div>
                <Dialog.Title>자동 메시 생성</Dialog.Title>
                <Dialog.Description>
                  {props.partName ?? '선택한 파트'}의 텍스처 알파를 기준으로 메시를 다시 만듭니다.
                </Dialog.Description>
              </div>
              <Dialog.CloseButton aria-label="자동 메시 설정 닫기">×</Dialog.CloseButton>
            </header>

            <fieldset class="auto-mesh-presets">
              <legend>프리셋</legend>
              <For each={PRESET_OPTIONS}>
                {(option) => (
                  <label>
                    <input
                      checked={preset() === option.value}
                      name="auto-mesh-preset"
                      type="radio"
                      value={option.value}
                      onChange={(event) => handlePresetChange(event.currentTarget.value)}
                    />
                    <span>
                      <strong>{option.label}</strong>
                      <small>{option.description}</small>
                    </span>
                  </label>
                )}
              </For>
            </fieldset>

            <div class="auto-mesh-settings">
              <label>
                <span>정점 간격</span>
                <span class="auto-mesh-number-field">
                  <input
                    aria-describedby="auto-mesh-cell-size-help"
                    min={minimumCellSize()}
                    required
                    step="1"
                    type="number"
                    value={cellSize()}
                    onInput={(event) => {
                      setPreset('custom')
                      setCellSize(event.currentTarget.valueAsNumber)
                    }}
                  />
                  px
                </span>
                <small id="auto-mesh-cell-size-help">
                  값이 작을수록 정점과 삼각형이 많아집니다.
                </small>
              </label>
              <label>
                <span>투명 판정값</span>
                <span class="auto-mesh-number-field">
                  <input
                    aria-describedby="auto-mesh-alpha-help"
                    max="255"
                    min="0"
                    required
                    step="1"
                    type="number"
                    value={alphaThreshold()}
                    onInput={(event) => setAlphaThreshold(event.currentTarget.valueAsNumber)}
                  />
                  / 255
                </span>
                <small id="auto-mesh-alpha-help">
                  반투명 먼지가 포함되면 값을 조금씩 높이세요.
                </small>
              </label>
            </div>

            <p class="auto-mesh-warning">
              메시 구조가 바뀌므로 이 파트에 저장된 Parameter 변형과 모션 정점 키프레임은
              초기화됩니다.
            </p>

            <Show when={props.errorMessage}>
              {(message) => (
                <p class="auto-mesh-error" role="alert">
                  {message()}
                </p>
              )}
            </Show>

            <AutoMeshDialogFooter
              canGenerate={props.onGenerate !== undefined}
              isGenerating={isGenerating()}
            />
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}
