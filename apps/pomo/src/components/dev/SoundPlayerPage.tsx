import {Title} from '@solidjs/meta'
import {A} from '@solidjs/router'
import {createSignal, onCleanup} from 'solid-js'
import {MAX_SOUND_LAYERS, type SoundLayer} from 'src/features/sound-player'
import {SoundPlayer} from '../sound-player/SoundPlayer'

const INPUT =
  'min-h-11 rounded-xl border border-solid border-#60566b bg-transparent px-4 py-2 text-inherit'

export const SoundPlayerPage = () => {
  const [layers, setLayers] = createSignal<readonly SoundLayer[]>([])
  const [source, setSource] = createSignal('')
  const [error, setError] = createSignal<string | null>(null)
  const urls: string[] = []
  const addLayer = (url: string, title: string) => {
    setLayers((current) => [...current, {id: crypto.randomUUID(), source: url, title}])
  }
  const addUrl = () => {
    try {
      const url = new URL(source())
      if (!['https:', 'http:'].includes(url.protocol)) {
        throw new Error('HTTP 또는 HTTPS 주소를 입력하세요.')
      }
      addLayer(url.href, `효과음 ${layers().length + 1}`)
      setSource('')
      setError(null)
    } catch {
      setError('유효한 오디오 URL을 입력하세요.')
    }
  }
  const handleFileChange = (event: Event & {currentTarget: HTMLInputElement}) => {
    const files = Array.from(event.currentTarget.files ?? []).slice(
      0,
      MAX_SOUND_LAYERS - layers().length,
    )
    for (const file of files) {
      const url = URL.createObjectURL(file)
      urls.push(url)
      addLayer(url, file.name)
    }
    event.currentTarget.value = ''
  }
  const handleUrlSubmit = (event: SubmitEvent) => {
    event.preventDefault()
    if (layers().length < MAX_SOUND_LAYERS) {
      addUrl()
    }
  }
  const handleLayerChange = (layer: SoundLayer) => {
    setLayers((current) => current.map((entry) => (entry.id === layer.id ? layer : entry)))
  }
  const handleClearClick = () => {
    setLayers([])
    for (const url of urls.splice(0)) {
      URL.revokeObjectURL(url)
    }
  }
  onCleanup(() => {
    for (const url of urls) {
      URL.revokeObjectURL(url)
    }
  })
  return (
    <main class="min-h-dvh bg-#17131f px-5 py-8 text-#f8edf1 sm:px-8">
      <Title>Pomofi — 효과음 플레이어</Title>
      <div class="mx-auto grid max-w-3xl gap-6">
        <A class="text-#b8e8d0" href="/dev">
          ← 실험실
        </A>
        <h1 class="m-0 text-3xl">효과음 플레이어</h1>
        <p class="m-0 leading-7 text-#bdb2c4">
          여러 환경음을 함께 반복 재생합니다. 일시정지하면 위치를 기억하고, 정지하면 처음으로
          돌아갑니다.
        </p>
        <label class="grid gap-2">
          오디오 추가 (최대 {MAX_SOUND_LAYERS}개)
          <input
            type="file"
            accept="audio/*"
            multiple
            disabled={layers().length >= MAX_SOUND_LAYERS}
            onChange={handleFileChange}
          />
        </label>
        <form class="flex flex-wrap gap-3" onSubmit={handleUrlSubmit}>
          <input
            class={`${INPUT} min-w-0 flex-1`}
            aria-label="오디오 URL"
            type="url"
            value={source()}
            onInput={(event) => setSource(event.currentTarget.value)}
            placeholder="https://…"
            required
          />
          <button class={INPUT} type="submit" disabled={layers().length >= MAX_SOUND_LAYERS}>
            URL 추가
          </button>
        </form>
        <p role="alert" class="m-0 text-#ffb4c5">
          {error()}
        </p>
        <SoundPlayer layers={layers()} onLayerChange={handleLayerChange} />
        <button
          class={INPUT}
          type="button"
          disabled={layers().length === 0}
          onClick={handleClearClick}
        >
          목록 비우기
        </button>
      </div>
    </main>
  )
}
