import {type Accessor, createEffect, createSignal, onCleanup} from 'solid-js'
import {
  createPlayer,
  type Player,
  preparePuppetDocument,
  type PuppetViewport,
} from '@winter-love/puppet/player'
import {getCoverCamera} from './cover-camera'

export * from './cover-camera'
export * from './use-background-source'

interface UseAnimatedBackgroundProps {
  readonly canvas: Accessor<HTMLCanvasElement | null>
  readonly host: Accessor<HTMLElement | null>
  readonly source: Accessor<string>
  /** Keep hidden scenes prepared without advancing their animation. */
  readonly playing?: Accessor<boolean>
  /** Crop alignment; omitted keeps existing backgrounds vertically centered. */
  readonly verticalAlign?: Accessor<'top' | 'center'>
}

export const useAnimatedBackground = (props: UseAnimatedBackgroundProps) => {
  const RESOLUTION_LIMIT = 2
  const [ready, setReady] = createSignal(false)
  const [player, setPlayer] = createSignal<Player | null>(null)
  createEffect(() => {
    const canvas = props.canvas()
    const host = props.host()
    const sourceUrl = props.source()
    const verticalAlign = props.verticalAlign?.() ?? 'center'
    if (canvas === null || host === null) {
      return
    }
    const cancellation = new AbortController()
    let active: Player | null = null
    let viewport: PuppetViewport | null = null
    let configured = false
    const fit = () => {
      if (active === null || viewport === null) {
        return
      }
      const camera = getCoverCamera({
        screen: {height: host.clientHeight, width: host.clientWidth},
        verticalAlign,
        viewport,
      })
      if (camera === null) {
        return
      }
      configured = false
      active.resize()
      configured = true
      active.setViewCamera(camera)
    }
    const load = async () => {
      const response = await fetch(sourceUrl, {
        signal: cancellation.signal,
      })
      if (!response.ok) {
        return
      }
      const source = await response.blob()
      const prepared = await preparePuppetDocument({signal: cancellation.signal, source})
      if (!prepared.ok || cancellation.signal.aborted) {
        return
      }
      const created = await createPlayer({
        canvas,
        document: prepared.document,
        motionId: 'ambient',
        onAfterRender: () => {
          if (configured && !cancellation.signal.aborted) {
            setReady(true)
          }
        },
        resizeTo: host,
        resolution:
          host.clientHeight > host.clientWidth
            ? RESOLUTION_LIMIT
            : Math.min(devicePixelRatio, RESOLUTION_LIMIT),
      })
      if (cancellation.signal.aborted) {
        created.destroy()
        return
      }
      active = created
      const {viewport: preparedViewport} = prepared.document
      viewport = preparedViewport
      fit()
      setPlayer(created)
    }
    const observer = new ResizeObserver(fit)
    observer.observe(host)
    load().catch((cause: unknown) => {
      if (!cancellation.signal.aborted) {
        console.warn('Animated background unavailable', cause)
      }
    })
    onCleanup(() => {
      cancellation.abort()
      observer.disconnect()
      setPlayer(null)
      active?.destroy()
      setReady(false)
    })
  })
  createEffect(() => {
    const active = player()
    const canvas = props.canvas()
    if (active === null || canvas === null) {
      return
    }
    const owner = canvas.ownerDocument
    const preference = owner.defaultView?.matchMedia('(prefers-reduced-motion: reduce)')
    const updatePlayback = () => {
      if (props.playing?.() === false || owner.hidden || preference?.matches) {
        active.pause()
      } else {
        active.resume()
      }
    }
    updatePlayback()
    owner.addEventListener('visibilitychange', updatePlayback)
    preference?.addEventListener('change', updatePlayback)
    onCleanup(() => {
      owner.removeEventListener('visibilitychange', updatePlayback)
      preference?.removeEventListener('change', updatePlayback)
    })
  })
  return {ready}
}
