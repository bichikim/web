import {createSignal} from 'solid-js'

import {useCharacterRenderer} from '../features/character-renderer'
import characterSceneSource from './assets/character-studio/scene.glb?url'
import {CharacterControls} from './character-studio/Controls'
import {CharacterViewport} from './character-studio/Viewport'

const DEFAULT_MODEL_URL = `${characterSceneSource}?renderer=babylon-1`
const DEFAULT_MODEL_NAME = 'Blender · character-studio.blend'

export const CharacterStudio = () => {
  const [urlInput, setUrlInput] = createSignal('')
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
    renderer.loadDefaultModel()
  }

  return (
    <section class="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_22rem]">
      <CharacterViewport
        modelUrl={renderer.modelUrl()}
        onLoadError={renderer.handleLoadError}
        onLoadProgress={renderer.handleLoadProgress}
        onLoadStart={renderer.handleLoadStart}
        onLoadSuccess={renderer.handleLoadSuccess}
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
