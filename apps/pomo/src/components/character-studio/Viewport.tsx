import type {FaceSettings} from './face-deformation'
import type {ExpressionSettings} from './expressions'
import {cx} from 'class-variance-authority'
import {createSignal, Show} from 'solid-js'
import {CameraControls} from './CameraControls'
import type {CameraCommand} from './camera-control'
import {type CharacterRendererStatus} from '../../features/character-renderer/index'
import {CharacterViewportCanvas} from './ViewportCanvas'

const VIEWER_CLASSES = cx(
  'relative min-h-105 overflow-hidden rounded-7 border border-white/10 bg-#111820',
  'shadow-[0_1.875rem_6.25rem_rgba(0,0,0,0.35)] 2xl:min-h-155',
)

const STATUS_CLASSES = cx(
  'pointer-events-none absolute left-4 top-4 flex max-w-[calc(100%-2rem)] items-center gap-2',
  'rounded-full border border-white/10 bg-#0c1117/78 px-3 py-2 text-xs backdrop-blur-md',
)

const HELP_CLASSES = cx(
  'pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap',
  'rounded-full bg-black/45 px-3 py-2 text-xs text-white/70 backdrop-blur-md',
)

interface CharacterViewportProps {
  readonly expressions?: ExpressionSettings
  readonly faceSettings?: FaceSettings
  readonly eyeNarrowing?: number
  readonly modelUrl: string
  readonly onLoadError: () => void
  readonly onLoadProgress: (progress: number) => void
  readonly onLoadStart: () => void
  readonly onLoadSuccess: () => void
  readonly progress: number
  readonly status: CharacterRendererStatus
}

const getStatusLabel = (status: CharacterRendererStatus, progress: number) => {
  if (status === 'loading') {
    return `모델 로딩 ${progress}%`
  }

  if (status === 'error') {
    return '3D 엔진을 불러오지 못했어요'
  }

  return '렌더링 중'
}

export const CharacterViewport = (props: CharacterViewportProps) => {
  const [cameraCommand, setCameraCommand] = createSignal<CameraCommand | null>(null)
  const handleLoadStart = () => {
    setCameraCommand(null)
    props.onLoadStart()
  }
  return (
    <div class="grid min-w-0 content-start gap-3">
      <div class={VIEWER_CLASSES}>
        <CharacterViewportCanvas
          cameraCommand={cameraCommand()}
          faceSettings={props.faceSettings}
          expressions={props.expressions}
          eyeNarrowing={props.eyeNarrowing}
          modelUrl={props.modelUrl}
          onLoadError={props.onLoadError}
          onLoadProgress={props.onLoadProgress}
          onLoadStart={handleLoadStart}
          onLoadSuccess={props.onLoadSuccess}
        />
        <Show when={props.status !== 'ready'}>
          <div
            class={cx(
              'pointer-events-none absolute inset-0 grid min-h-105 place-items-center',
              'bg-#111820/72 p-8 text-center backdrop-blur-sm 2xl:min-h-155',
            )}
          >
            <div>
              <div
                class="mx-auto h-10 w-10 rounded-full border-2 border-white/15 border-t-#a9e5d2"
                classList={{'animate-spin': props.status === 'loading'}}
              />
              <p class="mb-0 mt-4 text-sm text-#aab5bd">
                {props.status === 'error'
                  ? '이 브라우저에서 3D 모델을 불러오지 못했어요.'
                  : 'Babylon.js 렌더러를 준비하고 있어요.'}
              </p>
            </div>
          </div>
        </Show>

        <div class={STATUS_CLASSES}>
          <span
            class="h-2 w-2 shrink-0 rounded-full"
            classList={{
              'bg-#78d7b7': props.status === 'ready',
              'bg-#efb18f': props.status !== 'ready',
            }}
          />
          <span class="truncate text-#d9e1e6">{getStatusLabel(props.status, props.progress)}</span>
        </div>

        <div class={HELP_CLASSES}>드래그해서 회전 · 휠로 확대</div>
      </div>
      <CameraControls
        disabled={props.status !== 'ready'}
        onAction={(action) => setCameraCommand({action})}
      />
    </div>
  )
}
