import {type Accessor, createSignal, onCleanup, onMount} from 'solid-js'
import type {Player, PlayerViewCamera, PuppetLayout} from '@winter-love/puppet/player'
import {type CameraGesture, fitCamera, reframeCamera, transformCamera} from './camera'
import {loadViewerDocument} from './load-viewer-document'
import {useCameraGestures} from './use-camera-gestures'
import {useViewerLook} from './use-viewer-look'

interface UseCharacterViewerProps {
  readonly canvas: Accessor<HTMLCanvasElement | null>
  readonly viewport: Accessor<HTMLDivElement | null>
}

export const useCharacterViewer = (props: UseCharacterViewerProps) => {
  const [status, setStatus] = createSignal<'loading' | 'ready' | 'error'>('loading')
  const [camera, setCamera] = createSignal<PlayerViewCamera | null>(null)
  const [fitZoom, setFitZoom] = createSignal(1)
  let player: Player | undefined
  let layout: PuppetLayout = {height: 6500, width: 4800, x: 0, y: -500}
  let size = {height: 0, width: 0}

  const applyCamera = (next: PlayerViewCamera) => {
    setCamera(next)
    player?.setViewCamera(next)
  }

  const reset = () => {
    if (size.width > 0 && size.height > 0) {
      applyCamera(fitCamera({layout, viewport: size}))
    }
  }

  const resize = () => {
    const viewport = props.viewport()
    if (viewport === null || viewport.clientWidth <= 0 || viewport.clientHeight <= 0) {
      return
    }
    const next = {height: viewport.clientHeight, width: viewport.clientWidth}
    const fitted = fitCamera({layout, viewport: next})
    const previous = camera()
    const reframed =
      previous === null
        ? fitted
        : reframeCamera({
            camera: previous,
            from: size,
            to: next,
            zoom: fitted.zoom * (previous.zoom / fitZoom()),
          })
    size = next
    setFitZoom(fitted.zoom)
    applyCamera(reframed)
  }

  const transform = (from: CameraGesture, to: CameraGesture) => {
    const previous = camera()
    if (previous !== null) {
      const MINIMUM_SCALE = 0.25
      const MAXIMUM_SCALE = 48
      applyCamera(
        transformCamera({
          camera: previous,
          from,
          maximum: fitZoom() * MAXIMUM_SCALE,
          minimum: fitZoom() * MINIMUM_SCALE,
          to,
        }),
      )
    }
  }

  const look = useViewerLook({
    onLook: (target) => player?.setLookTarget(target),
    viewport: props.viewport,
  })
  const gestures = useCameraGestures({
    onLeave: look.clearLook,
    onReset: reset,
    onTransform: transform,
    viewport: props.viewport,
  })

  const handleLook = (event: PointerEvent) => {
    if (!gestures.dragging()) {
      look.handleLook(event)
    }
  }

  onMount(() => {
    const canvas = props.canvas()
    const viewport = props.viewport()
    if (canvas === null || viewport === null) {
      return
    }
    const request = new AbortController()
    const observer = new ResizeObserver(resize)
    const load = async () => {
      const [{createPlayer}, document] = await Promise.all([
        import('@winter-love/puppet/player'),
        loadViewerDocument(request.signal),
      ])
      if (request.signal.aborted) {
        return
      }
      layout = document.layout ?? {...document.viewport, x: 0, y: 0}
      const active = await createPlayer({
        canvas,
        document,
        onAfterRender: () => {
          if (!request.signal.aborted && status() !== 'ready') {
            setStatus('ready')
          }
        },
        resizeTo: viewport,
        resolution: Math.min(globalThis.devicePixelRatio, 2),
      })
      if (request.signal.aborted) {
        active.destroy()
        return
      }
      player = active
      resize()
      observer.observe(viewport)
      active.setMotion('Idle:0')
      active.resetParameters(['ParamAngleX', 'ParamAngleY'])
      active.resume()
    }
    load().catch((error: unknown) => {
      if (!request.signal.aborted) {
        console.error('Character viewer failed to load', error)
        setStatus('error')
      }
    })
    onCleanup(() => {
      request.abort()
      observer.disconnect()
      player?.destroy()
    })
  })

  const PERCENT = 100
  return {
    ...gestures,
    ...look,
    handleLook,
    reset,
    status,
    zoomPercent: () => Math.round(((camera()?.zoom ?? fitZoom()) / fitZoom()) * PERCENT),
  }
}
