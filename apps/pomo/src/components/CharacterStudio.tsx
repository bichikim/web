import type {NeedleEngineWebComponent} from '@needle-tools/engine'
import {cx} from 'class-variance-authority'
import {createSignal, onMount, Show} from 'solid-js'

import {type CharacterRendererStatus, useCharacterRenderer} from '../features/character-renderer'

const DEFAULT_MODEL_URL = '/models/blender/scene.glb?integration=2'
const DEFAULT_MODEL_NAME = 'Blender · character-studio.blend'
const VIEWER_CLASSES = cx(
  'relative min-h-105 overflow-hidden rounded-7 border border-white/10 bg-#111820',
  'shadow-[0_30px_100px_rgba(0,0,0,0.35)] lg:min-h-155',
)
const INPUT_CLASSES = cx(
  'h-12 min-w-0 rounded-3 border border-white/10 bg-#0d1218 px-4 text-sm text-white outline-none',
  'placeholder:text-#64707a focus:border-#8bd8c0/55',
)
const BUTTON_CLASSES = cx(
  'h-12 rounded-3 bg-#a9e5d2 px-5 text-sm font-750 text-#10221d transition hover:bg-#c4f4e5',
  'disabled:cursor-not-allowed disabled:opacity-40',
)
const STATUS_CLASSES = cx(
  'pointer-events-none absolute left-4 top-4 flex max-w-[calc(100%-2rem)] items-center gap-2',
  'rounded-full border border-white/10 bg-#0c1117/78 px-3 py-2 text-xs backdrop-blur-md',
)
const HELP_CLASSES = cx(
  'pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap',
  'rounded-full bg-black/45 px-3 py-2 text-xs text-white/70 backdrop-blur-md',
)
const ASIDE_CLASSES = cx(
  'grid content-start gap-5 rounded-7 border border-white/10 bg-#171f28/88 p-5',
  'shadow-[0_24px_80px_rgba(0,0,0,0.24)] backdrop-blur-xl sm:p-6',
)
const FILE_PICKER_CLASSES = cx(
  'grid h-12 cursor-pointer place-items-center rounded-3 border border-dashed',
  'border-#8bd8c0/35 bg-#8bd8c0/5 text-sm text-#b8e8d8 transition hover:bg-#8bd8c0/10',
)
const RESET_BUTTON_CLASSES = cx(
  'h-11 rounded-3 border border-white/10 bg-transparent text-sm font-650 text-#aab5bd',
  'transition hover:bg-white/5 hover:text-white',
)

interface CharacterViewerProps {
  readonly modelUrl: string
  readonly onEngineReady: (element: NeedleEngineWebComponent) => void
  readonly progress: number
  readonly status: CharacterRendererStatus
}

interface CharacterControlsProps {
  readonly modelName: string
  readonly onDefaultModelClick: () => void
  readonly onFileChange: (event: Event & {currentTarget: HTMLInputElement}) => void
  readonly onUrlInput: (event: InputEvent & {currentTarget: HTMLInputElement}) => void
  readonly onUrlSubmit: (event: SubmitEvent) => void
  readonly urlInput: string
}

const getStatusLabel = (status: CharacterRendererStatus, progress: number) => {
  if (status === 'booting') {
    return '3D 엔진 준비 중'
  }

  if (status === 'loading') {
    return `모델 로딩 ${progress}%`
  }

  if (status === 'error') {
    return '3D 엔진을 불러오지 못했어요'
  }

  return '렌더링 중'
}

const CharacterViewer = (props: CharacterViewerProps) => (
  <div class={VIEWER_CLASSES}>
    <Show
      fallback={
        <div class="grid min-h-105 place-items-center p-8 text-center lg:min-h-155">
          <div>
            <div class="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-#a9e5d2" />
            <p class="mb-0 mt-4 text-sm text-#aab5bd">
              {props.status === 'error'
                ? '이 브라우저에서 3D 엔진을 시작하지 못했어요.'
                : 'Needle Engine을 준비하고 있어요.'}
            </p>
          </div>
        </div>
      }
      when={props.status === 'loading' || props.status === 'ready'}
    >
      <needle-engine
        auto-fit="true"
        auto-rotate="true"
        autoplay="true"
        background-color="#111820"
        camera-controls="true"
        class="absolute inset-0 h-full w-full"
        contact-shadows="true"
        environment-image="studio"
        loading-style="dark"
        ref={props.onEngineReady}
        src={props.modelUrl}
        tone-mapping="agx"
      />
    </Show>

    <div class={STATUS_CLASSES}>
      <span
        class="h-2 w-2 shrink-0 rounded-full"
        classList={{'bg-#78d7b7': props.status === 'ready', 'bg-#efb18f': props.status !== 'ready'}}
      />
      <span class="truncate text-#d9e1e6">{getStatusLabel(props.status, props.progress)}</span>
    </div>

    <div class={HELP_CLASSES}>드래그해서 회전 · 휠로 확대</div>
  </div>
)

const CharacterControls = (props: CharacterControlsProps) => (
  <aside class={ASIDE_CLASSES}>
    <header>
      <p class="m-0 text-xs font-750 tracking-[0.22em] text-#8bd8c0 uppercase">3D character lab</p>
      <h1 class="mb-0 mt-3 text-2xl font-800 tracking--0.03em">Blender 캐릭터 연결</h1>
      <p class="mb-0 mt-3 text-sm leading-6 text-#9ba8b1">
        Needle Engine으로 GLB를 렌더링해요. Blender에서 내보낸 파일을 선택하면 즉시 교체됩니다.
      </p>
    </header>

    <div class="rounded-4 border border-#8bd8c0/14 bg-#8bd8c0/5 p-4">
      <p class="m-0 text-xs font-650 text-#89a49b">현재 모델</p>
      <p class="mb-0 mt-1 truncate text-sm font-700 text-#dff7ef">{props.modelName}</p>
    </div>

    <label class="grid gap-2 text-sm font-650 text-#d9e1e6">
      로컬 GLB 파일
      <span class={FILE_PICKER_CLASSES}>
        Blender GLB 선택
        <input
          accept=".glb,model/gltf-binary"
          class="sr-only"
          onChange={(event) => props.onFileChange(event)}
          type="file"
        />
      </span>
    </label>

    <form class="grid gap-2" onSubmit={(event) => props.onUrlSubmit(event)}>
      <label class="text-sm font-650 text-#d9e1e6" for="character-model-url">
        GLB 또는 Needle Cloud URL
      </label>
      <input
        class={INPUT_CLASSES}
        id="character-model-url"
        onInput={(event) => props.onUrlInput(event)}
        placeholder="https://…/character.glb"
        type="url"
        value={props.urlInput}
      />
      <button class={BUTTON_CLASSES} disabled={props.urlInput.trim().length === 0} type="submit">
        URL 모델 불러오기
      </button>
    </form>

    <button class={RESET_BUTTON_CLASSES} onClick={() => props.onDefaultModelClick()} type="button">
      기본 캐릭터로 되돌리기
    </button>

    <div class="border-t border-white/8 pt-5">
      <h2 class="m-0 text-sm font-750 text-#d9e1e6">Blender 연결 순서</h2>
      <ol class="mb-0 mt-3 grid gap-2 pl-5 text-xs leading-5 text-#8f9ca5">
        <li>Needle Engine Exporter 애드온 설치</li>
        <li>카메라에 OrbitControls 추가</li>
        <li>장면을 GLB 또는 Needle Cloud로 내보내기</li>
        <li>위 파일/URL 입력으로 이 페이지에서 검증</li>
      </ol>
    </div>
  </aside>
)

export const CharacterStudio = () => {
  const [urlInput, setUrlInput] = createSignal('')
  const renderer = useCharacterRenderer({
    defaultModelName: DEFAULT_MODEL_NAME,
    defaultModelUrl: DEFAULT_MODEL_URL,
  })

  onMount(() => {
    renderer.prepare().catch((error: unknown) => {
      console.error('Unexpected character renderer preparation failure', error)
    })
  })

  const handleFileChange = (event: Event & {currentTarget: HTMLInputElement}) => {
    const file = event.currentTarget.files?.[0]

    if (file === undefined) {
      return
    }

    renderer.loadFile(file)
    event.currentTarget.value = ''
  }

  const handleUrlInput = (event: InputEvent & {currentTarget: HTMLInputElement}) => {
    setUrlInput(event.currentTarget.value)
  }

  const handleUrlSubmit = (event: SubmitEvent) => {
    event.preventDefault()
    const url = urlInput().trim()

    if (renderer.loadUrl(url)) {
      setUrlInput('')
    }
  }

  const handleDefaultModelClick = () => {
    setUrlInput('')
    renderer.loadDefaultModel()
  }

  return (
    <section class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <CharacterViewer
        modelUrl={renderer.modelUrl()}
        onEngineReady={renderer.attachElement}
        progress={renderer.progress()}
        status={renderer.status()}
      />
      <CharacterControls
        modelName={renderer.modelName()}
        onDefaultModelClick={handleDefaultModelClick}
        onFileChange={handleFileChange}
        onUrlInput={handleUrlInput}
        onUrlSubmit={handleUrlSubmit}
        urlInput={urlInput()}
      />
    </section>
  )
}
