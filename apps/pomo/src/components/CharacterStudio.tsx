import {FaceControls} from './character-studio/FaceControls'
import type {FaceSettings} from './character-studio/face-deformation'
import {ExpressionControls} from './character-studio/ExpressionControls'
import {DEFAULT_EXPRESSIONS} from './character-studio/expressions'
import {createSignal, Show} from 'solid-js'

import {useCharacterRenderer} from '../features/character-renderer'
import {CharacterControls} from './character-studio/Controls'
import {CharacterViewport} from './character-studio/Viewport'

const VROID_MODEL_URL = '/character-studio/scene.glb'
const DEFAULT_MODEL_URL = '/character-studio/pomo.glb'
const DEFAULT_MODEL_NAME = 'Pomo · 파츠 분리 모델'
const PERCENT_SCALE = 100

export const CharacterStudio = () => {
  const [faceSettings, setFaceSettings] = createSignal<FaceSettings>({})
  const [expressions, setExpressions] = createSignal({...DEFAULT_EXPRESSIONS})
  const [urlInput, setUrlInput] = createSignal('')
  const [eyeNarrowing, setEyeNarrowing] = createSignal(0)
  const renderer = useCharacterRenderer({
    defaultModelName: DEFAULT_MODEL_NAME,
    defaultModelUrl: DEFAULT_MODEL_URL,
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
    if (renderer.modelUrl() !== DEFAULT_MODEL_URL) {
      renderer.loadDefaultModel()
    }
  }

  return (
    <section class="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_22rem]">
      <CharacterViewport
        faceSettings={renderer.modelUrl() === VROID_MODEL_URL ? faceSettings() : undefined}
        expressions={renderer.modelUrl() === VROID_MODEL_URL ? expressions() : undefined}
        eyeNarrowing={renderer.modelUrl() === VROID_MODEL_URL ? eyeNarrowing() : 0}
        modelUrl={renderer.modelUrl()}
        onLoadError={renderer.handleLoadError}
        onLoadProgress={renderer.handleLoadProgress}
        onLoadStart={renderer.handleLoadStart}
        onLoadSuccess={renderer.handleLoadSuccess}
        progress={renderer.progress()}
        status={renderer.status()}
      />
      <div class="grid content-start gap-5">
        <section class="grid gap-3 rounded-7 border border-white/10 bg-#171f28/88 p-5 text-#d9e1e6">
          <h2 class="m-0 text-lg font-750">캐릭터 선택</h2>
          <div class="grid grid-cols-2 gap-2">
            <button
              type="button"
              class="min-h-11 rounded-3 border border-white/15 bg-transparent text-sm aria-pressed:bg-#31534b"
              aria-pressed={renderer.modelUrl() === VROID_MODEL_URL}
              onClick={() => {
                if (renderer.modelUrl() !== VROID_MODEL_URL) {
                  renderer.loadUrl(VROID_MODEL_URL)
                }
              }}
            >
              VRoid
            </button>
            <button
              type="button"
              class="min-h-11 rounded-3 border border-white/15 bg-transparent text-sm aria-pressed:bg-#31534b"
              aria-pressed={renderer.modelUrl() === DEFAULT_MODEL_URL}
              onClick={handleDefaultModelClick}
            >
              Pomo
            </button>
          </div>
          <p class="m-0 text-sm leading-6 text-#9ba8b1">
            이 페이지에서 전환하는 동안 각 캐릭터의 조정값을 유지합니다.
          </p>
        </section>
        <Show when={renderer.modelUrl() === VROID_MODEL_URL}>
          <FaceControls
            value={faceSettings()}
            onChange={setFaceSettings}
            disabled={renderer.status() !== 'ready'}
          />
          <ExpressionControls
            value={expressions()}
            onChange={setExpressions}
            disabled={renderer.status() !== 'ready'}
          />
          <section class="grid gap-4 rounded-7 border border-white/10 bg-#171f28/88 p-5 text-#d9e1e6">
            <h2 class="m-0 text-lg font-750">눈 가로폭</h2>
            <p class="m-0 text-sm leading-6 text-#9ba8b1">
              눈의 가로폭을 좁혀 인상을 조정해요. 값이 클수록 눈이 좁아집니다.
            </p>
            <label class="grid gap-3 text-sm">
              좁힘 정도 · {Math.round(eyeNarrowing() * PERCENT_SCALE)}%
              <input
                aria-label="눈 가로폭 좁힘 정도"
                class="w-full accent-#a9e5d2"
                max="1"
                min="0"
                onInput={(event) => setEyeNarrowing(event.currentTarget.valueAsNumber)}
                step="0.01"
                type="range"
                value={eyeNarrowing()}
              />
            </label>
            <button
              class="min-h-11 rounded-3 border border-white/15 bg-transparent text-sm"
              onClick={() => setEyeNarrowing(0)}
              type="button"
            >
              눈 가로폭 초기화
            </button>
          </section>
        </Show>
        <CharacterControls
          modelName={
            renderer.modelUrl() === VROID_MODEL_URL
              ? 'VRoid · AvatarSample_M · pixiv VRoid Project'
              : renderer.modelName()
          }
          onDefaultModelClick={handleDefaultModelClick}
          onFileChange={handleFileChange}
          onUrlInput={handleUrlInput}
          onUrlSubmit={handleUrlSubmit}
          urlInput={urlInput()}
        />
      </div>
    </section>
  )
}
