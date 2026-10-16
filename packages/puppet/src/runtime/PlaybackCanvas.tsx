import type {RuntimeView} from '../tracking/types'
import {ViewCameraControls} from '../editor/internal/ViewCameraControls'
import {usePlaybackView} from './use-playback-view'
import {createEffect, createSignal, onCleanup, untrack} from 'solid-js'
import type {PuppetParameterValueMap} from '../deformation'
import {createPlayer, type Player, type PlayerFrame, type PreparedPuppetDocument} from '../player'

interface PlaybackCanvasProps {
  readonly view?: RuntimeView
  readonly onViewChange?: (view: RuntimeView) => void
  readonly parameterValues?: PuppetParameterValueMap
  readonly document: PreparedPuppetDocument
  readonly motionId?: string
  readonly playing: boolean
  readonly onFrame: (frame: PlayerFrame) => void
  readonly onReady: (ready: boolean) => void
  readonly onError: (message: string) => void
}

export const PlaybackCanvas = (props: PlaybackCanvasProps) => {
  const [host, setHost] = createSignal<HTMLDivElement>()
  const [canvas, setCanvas] = createSignal<HTMLCanvasElement>()
  const [player, setPlayer] = createSignal<Player | null>(null)
  const view = usePlaybackView({
    element: () => host() ?? null,
    height: () => props.document.viewport.height,
    onChange: (view) => props.onViewChange?.(view),
    saved: () => props.view,
    width: () => props.document.viewport.width,
  })
  createEffect(() => {
    const resizeTo = host()
    const element = canvas()
    const prepared = props.document
    if (resizeTo === undefined || element === undefined) {
      return
    }
    let disposed = false
    let current: Player | undefined
    props.onReady(false)
    createPlayer({
      canvas: element,
      document: prepared,
      onFrame: (frame) => untrack(() => props.onFrame(frame)),
      resizeTo,
      viewportPadding: 0.05,
    })
      .then((created) => {
        if (disposed) {
          created.destroy()
          return
        }
        current = created
        setPlayer(created)
        untrack(() => props.onReady(true))
      })
      .catch((error: unknown) => {
        if (!disposed) {
          untrack(() =>
            props.onError(
              error instanceof Error ? error.message : '플레이어를 시작하지 못했습니다.',
            ),
          )
        }
      })
    onCleanup(() => {
      disposed = true
      current?.destroy()
      setPlayer(null)
      props.onReady(false)
    })
  })
  createEffect(() => {
    player()?.setParameterValues(props.parameterValues ?? {})
  })
  createEffect(() => {
    const current = player()
    const selectedMotion = props.motionId
    if (current !== null && selectedMotion !== undefined) {
      current.setMotion(selectedMotion)
    }
  })
  createEffect(() => {
    const current = player()
    if (props.playing) {
      current?.resume()
    } else {
      current?.pause()
    }
  })
  createEffect(() => {
    player()?.setViewCamera(view.camera())
  })
  createEffect(() => {
    const element = host()
    if (element === undefined) {
      return
    }
    const observer = new ResizeObserver(() => untrack(player)?.resize())
    observer.observe(element)
    onCleanup(() => observer.disconnect())
  })
  return (
    <div
      class="puppet-viewer-stage"
      data-panning={view.panning()}
      role="region"
      aria-label="모델 보기"
    >
      <div class="puppet-viewer-surface" ref={setHost}>
        <canvas aria-label="모델 뷰어" ref={setCanvas} />
      </div>
      <ViewCameraControls camera={view.camera()} onChange={view.navigate} onFit={view.fit} />
    </div>
  )
}
