import {createSignal, onCleanup, onMount} from 'solid-js'
import type {Player, PuppetLayout} from '@winter-love/puppet/player'
import {getCharacterLook} from './get-character-look'

export function SFortuneTeller() {
  let canvas!: HTMLCanvasElement
  let frame!: HTMLDivElement
  const [rendered, setRendered] = createSignal(false)

  onMount(() => {
    const request = new AbortController()
    let player: Player | undefined
    let layout: PuppetLayout = {height: 6000, width: 4800, x: 0, y: 0}
    const owner = frame.ownerDocument
    const view = owner.defaultView
    const handleLook = (event: PointerEvent) => {
      if (event.pointerType !== 'touch') {
        player?.setLookTarget(getCharacterLook(frame.getBoundingClientRect(), event, layout))
      }
    }
    const handleLeave = () => player?.setLookTarget()
    view?.addEventListener('pointermove', handleLook, {passive: true})
    owner.addEventListener('pointerleave', handleLeave)
    view?.addEventListener('blur', handleLeave)

    const load = async () => {
      const [{createPlayer, preparePuppetDocument}, response] = await Promise.all([
        import('@winter-love/puppet/player'),
        fetch('/models/fortune-teller/model.poffo', {cache: 'no-cache', signal: request.signal}),
      ])
      if (!response.ok) {
        throw new Error('Fortune character download failed')
      }
      const source = await preparePuppetDocument({
        signal: request.signal,
        source: await response.blob(),
      })
      if (!source.ok) {
        throw new Error('Invalid fortune character')
      }
      const result =
        source.document.look === undefined
          ? await preparePuppetDocument({
              document: {
                ...source.document,
                look: [
                  {parameterId: 'ParamAngleX', x: 20, xy: 0, y: 0},
                  {parameterId: 'ParamAngleY', x: 0, xy: 0, y: 15},
                  {parameterId: 'ParamEyeBallX', x: 1, xy: 0, y: 0},
                  {parameterId: 'ParamEyeBallY', x: 0, xy: 0, y: 1},
                ],
              },
              signal: request.signal,
            })
          : source
      if (!result.ok) {
        throw new Error('Invalid fortune character tracking')
      }
      if (request.signal.aborted) {
        return
      }

      layout = result.document.layout ?? {...result.document.viewport, x: 0, y: 0}
      const active = await createPlayer({
        canvas,
        document: result.document,
        framing: 'layout',
        onAfterRender: () => {
          if (!rendered() && !request.signal.aborted) {
            setRendered(true)
          }
        },
        resizeTo: frame,
        resolution: Math.min(window.devicePixelRatio, 2),
      })
      if (request.signal.aborted) {
        active.destroy()
        return
      }
      player = active
      active.setMotion('Idle:0')
      active.resume()
    }

    load().catch((error: unknown) => {
      if (!request.signal.aborted) {
        console.error('Fortune character failed to load', error)
      }
    })
    onCleanup(() => {
      view?.removeEventListener('pointermove', handleLook)
      owner.removeEventListener('pointerleave', handleLeave)
      view?.removeEventListener('blur', handleLeave)
      request.abort()
      player?.destroy()
    })
  })

  return (
    <div
      class="relative mx-auto h-120 w-64 overflow-clip sm:h-160 sm:w-80"
      role="img"
      aria-label="점술가 캐릭터"
    >
      <div
        ref={(element) => (frame = element)}
        class="pointer-events-none absolute inset-y-0 left-1/2 aspect-[4/5] -translate-x-1/2"
      >
        <img
          alt=""
          src="/models/fortune-teller/poster.png"
          class="absolute inset-0 size-full object-contain"
          hidden={rendered()}
        />
        <canvas
          ref={(element) => (canvas = element)}
          aria-hidden="true"
          class="absolute inset-0 size-full"
        />
      </div>
    </div>
  )
}
