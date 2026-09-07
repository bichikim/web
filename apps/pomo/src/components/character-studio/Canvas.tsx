import {Engine} from '@babylonjs/core/Engines/engine'
import {createEffect, createSignal, onCleanup, onMount, Show, untrack} from 'solid-js'
import {applyCameraCommand, type CameraCommand} from './camera-control'
import {type AppearanceSettings, createCharacterRenderer} from './renderer'
import {reportClientError} from '../../features/client-error-reporter'

interface CharacterCanvasProps extends AppearanceSettings {
  readonly cameraCommand?: CameraCommand | null
  readonly modelUrl: string
  readonly onLoadError: () => void
  readonly onLoadProgress: (progress: number) => void
  readonly onLoadStart: () => void
  readonly onLoadSuccess: () => void
}
const MILLISECONDS_PER_SECOND = 1000
const CharacterCanvas = (props: CharacterCanvasProps) => {
  const [canvas, setCanvas] = createSignal<HTMLCanvasElement | null>(null)
  const [clothAvailable, setClothAvailable] = createSignal(false)
  const [clothEnabled, setClothEnabled] = createSignal(true)
  const [windEnabled, setWindEnabled] = createSignal(true)
  onMount(() => {
    const surface = canvas()
    if (surface === null) {
      return
    }
    let engine: Engine
    try {
      engine = new Engine(
        surface,
        true,
        {powerPreference: 'high-performance', preserveDrawingBuffer: false, stencil: true},
        true,
      )
    } catch (error: unknown) {
      reportClientError(error, {feature: 'character-renderer', source: 'direct'})
      props.onLoadError()
      return
    }
    const renderer = createCharacterRenderer(engine, {
      onCloth: setClothAvailable,
      onError: (error) => {
        reportClientError(error, {feature: 'character-model', source: 'direct'})
        props.onLoadError()
      },
      onProgress: (progress) => props.onLoadProgress(progress),
      onReady: () => props.onLoadSuccess(),
      onStart: () => props.onLoadStart(),
    })
    renderer.camera.attachControl(surface, true)
    createEffect(() => {
      const command = props.cameraCommand
      if (command !== null && command !== undefined) {
        applyCameraCommand(renderer.camera, command)
      }
    })
    createEffect(() => {
      renderer.appearance({
        expressions: props.expressions,
        eyeNarrowing: props.eyeNarrowing,
        faceSettings: props.faceSettings,
      })
    })
    createEffect(() => {
      const url = props.modelUrl
      untrack(() => renderer.load(url))
    })
    const observer = new ResizeObserver(() => engine.resize())
    observer.observe(surface)
    // eslint-disable-next-line solid/reactivity -- Read controls for each rendered frame.
    engine.runRenderLoop(() =>
      renderer.render(
        engine.getDeltaTime() / MILLISECONDS_PER_SECOND,
        clothEnabled(),
        windEnabled() ? 1 : 0,
      ),
    )
    onCleanup(() => {
      observer.disconnect()
      engine.stopRenderLoop()
      renderer.dispose()
      engine.dispose()
    })
  })
  return (
    <>
      <canvas class="absolute inset-0 h-full w-full touch-none outline-none" ref={setCanvas} />
      <Show when={clothAvailable()}>
        <div class="absolute right-4 top-4 flex gap-2 rounded-xl bg-black/70 p-2 text-sm text-white">
          <button
            type="button"
            class="rounded-lg px-3 py-2 hover:bg-white/15"
            aria-pressed={clothEnabled()}
            onClick={() => setClothEnabled((value) => !value)}
          >
            천 물리 {clothEnabled() ? '켜짐' : '꺼짐'}
          </button>
          <button
            type="button"
            class="rounded-lg px-3 py-2 hover:bg-white/15 disabled:opacity-40"
            disabled={!clothEnabled()}
            aria-pressed={windEnabled()}
            onClick={() => setWindEnabled((value) => !value)}
          >
            바람 {windEnabled() ? '켜짐' : '꺼짐'}
          </button>
        </div>
      </Show>
    </>
  )
}

export default CharacterCanvas
