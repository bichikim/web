import {Title} from '@solidjs/meta'
import {A} from '@solidjs/router'
import {createSignal, Show} from 'solid-js'
import {cx} from 'class-variance-authority'

import {TrainViewportCanvas} from 'src/components/character-studio/TrainViewportCanvas'
import {ExpressionControls} from 'src/components/character-studio/ExpressionControls'
import {FaceControls} from 'src/components/character-studio/FaceControls'
import {DEFAULT_EXPRESSIONS} from 'src/components/character-studio/expressions'
import type {FaceSettings} from 'src/components/character-studio/face-deformation'
import type {CabinStatus} from 'src/components/character-studio/train-cabin'

const CHARACTERS = {
  haru: '/assets/character-studio/haru.vrm?renderer=babylon-1',
  luna: '/assets/character-studio/vroid.glb?renderer=babylon-1',
} as const
const COMPLETE_PROGRESS = 100
const SEATED_CHARACTERS = Object.values(CHARACTERS)
const CABIN_LABELS = {
  error: '객실을 불러오지 못했어요',
  loading: '객실 불러오는 중…',
  ready: '1930s Train Cabin',
}

const MAIN_CLASSES = cx('relative h-dvh overflow-hidden bg-#0e1117 text-#f5f7fa')
const HEADER_CLASSES = cx(
  'absolute inset-x-0 top-0 flex items-start justify-between gap-4 p-5 xs:p-8',
  'pointer-events-none',
)
const BACK_LINK_CLASSES = cx(
  'pointer-events-auto inline-flex min-h-11 items-center rounded-full border border-white/10',
  'bg-#0d1218/72 px-4 text-sm font-650 text-#d9e1e6 no-underline backdrop-blur-md',
  'transition hover:border-white/25 hover:bg-#171f28/88 hover:text-white',
  'focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-#f2a7b8',
)
const STATUS_CLASSES = cx(
  'rounded-full border border-white/10 bg-#0d1218/72 px-4 py-3 text-right backdrop-blur-md',
)
const FOOTER_CLASSES = cx(
  'absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 xs:p-8',
  'pointer-events-none',
)
const HINT_CLASSES = cx(
  'rounded-full border border-white/10 bg-#0d1218/72 px-4 py-3 text-xs text-#c3cdd2 backdrop-blur-md',
)

type RenderStatus = 'error' | 'loading' | 'ready'

const getStatusLabel = (status: RenderStatus, progress: number) => {
  if (status === 'loading') {
    return `캐릭터 로딩 ${progress}%`
  }

  if (status === 'error') {
    return '캐릭터를 불러오지 못했어요'
  }

  return '준비 완료'
}

export function AiConversationPage() {
  const [character, setCharacter] = createSignal<keyof typeof CHARACTERS>('haru')
  const [cabinStatus, setCabinStatus] = createSignal<CabinStatus>('loading')
  const [expressions, setExpressions] = createSignal({...DEFAULT_EXPRESSIONS})
  const [faceSettings, setFaceSettings] = createSignal<FaceSettings>({})
  const [progress, setProgress] = createSignal(0)
  const [status, setStatus] = createSignal<RenderStatus>('loading')

  return (
    <main class={MAIN_CLASSES}>
      <Title>Pomofi — AI끼리 대화</Title>
      <TrainViewportCanvas
        autoRotate={false}
        cacheModels
        trainCabin
        seatedCharacters={SEATED_CHARACTERS}
        onCabinStatus={setCabinStatus}
        expressions={expressions()}
        faceSettings={faceSettings()}
        modelUrl={CHARACTERS[character()]}
        onLoadError={() => setStatus('error')}
        onLoadProgress={(nextProgress) => setProgress(Math.round(nextProgress))}
        onLoadStart={() => {
          setProgress(0)
          setStatus('loading')
        }}
        onLoadSuccess={() => {
          setProgress(COMPLETE_PROGRESS)
          setStatus('ready')
        }}
      />

      <header class={HEADER_CLASSES}>
        <A class={BACK_LINK_CLASSES} href="/dev">
          ← 실험실 목록
        </A>
        <div class={STATUS_CLASSES}>
          <p class="m-0 text-xs font-750 tracking-[0.2em] text-#f2a7b8 uppercase">
            AI conversation
          </p>
          <h1 class="mb-0 mt-1 text-sm font-800 text-white">AI끼리 대화</h1>
          <p class="mb-0 mt-1 text-xs text-#c3cdd2" role="status">
            {CABIN_LABELS[cabinStatus()]}
          </p>
          <p class="mb-0 mt-1 text-sm font-700 text-white">
            {getStatusLabel(status(), progress())}
          </p>
        </div>
      </header>

      <details
        class={cx(
          'absolute left-5 top-36 max-h-[calc(100dvh-15rem)] w-[min(20rem,calc(100%-2.5rem))]',
          'overflow-y-auto rounded-5 bg-#111820/95 text-white',
        )}
      >
        <summary class="cursor-pointer p-4 text-sm font-700">캐릭터 설정</summary>
        <label class="block p-4 text-sm font-700">
          표정 조절 대상 · 하루와 루나
          <select
            class={cx(
              'mt-2 block min-h-11 w-full rounded-3 border border-white/20 bg-#111820 px-3 text-white',
              'focus-visible:outline-2 focus-visible:outline-#f2a7b8',
            )}
            value={character()}
            onChange={(event) => {
              const next = event.currentTarget.value
              if (next === 'haru' || next === 'luna') {
                setCharacter(next)
              }
            }}
          >
            <option value="haru">하루 · 단발 카디건</option>
            <option value="luna">루나 · 은발 드레스</option>
          </select>
        </label>
        <p class="m-0 px-4 pb-3 text-xs text-#c3cdd2">모델 제작: pixiv VRoid Project</p>
        <p class="m-0 px-4 pb-3 text-xs text-#c3cdd2">
          객실:{' '}
          <a
            class="text-inherit underline"
            href="https://sketchfab.com/3d-models/1930s-train-cabin-2f109ba713fe455b959e4d79676b5c2d"
          >
            thomas.rynne
          </a>
          {' · '}
          <a class="text-inherit underline" href="https://creativecommons.org/licenses/by/4.0/">
            CC BY 4.0
          </a>
          {' · 크기·배치 조정'}
        </p>
        <details>
          <summary class="cursor-pointer p-4 text-sm font-700 focus-visible:outline-2 focus-visible:outline-#f2a7b8">
            표정·입 모양 조절
          </summary>
          <ExpressionControls
            value={expressions()}
            onChange={setExpressions}
            disabled={status() !== 'ready'}
          />
          <Show when={character() === 'luna'}>
            <FaceControls
              value={faceSettings()}
              onChange={setFaceSettings}
              disabled={status() !== 'ready'}
            />
          </Show>
        </details>
      </details>

      <footer class={FOOTER_CLASSES}>
        <div class={HINT_CLASSES}>클릭 후 WASD 이동 · 드래그 시점 회전 · 휠로 확대</div>
        <div class={HINT_CLASSES}>다음 단계: 두 AI 대화 연결</div>
      </footer>
    </main>
  )
}
