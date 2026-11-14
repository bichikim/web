import {createSignal, onCleanup, onMount} from 'solid-js'
import type {Player} from '@winter-love/puppet/player'

export function SFortuneTeller() {
  let canvas!: HTMLCanvasElement
  let frame!: HTMLDivElement
  const [rendered, setRendered] = createSignal(false)

  onMount(() => {
    const request = new AbortController()
    let player: Player | undefined

    const load = async () => {
      const [{createPlayer, preparePuppetDocument}, response] = await Promise.all([
        import('@winter-love/puppet/player'),
        fetch('/models/fortune-teller/model.poffo', {cache: 'no-cache', signal: request.signal}),
      ])
      if (!response.ok) {
        throw new Error('Fortune character download failed')
      }
      const result = await preparePuppetDocument({
        signal: request.signal,
        source: await response.blob(),
      })
      if (!result.ok) {
        throw new Error('Invalid fortune character')
      }
      if (request.signal.aborted) {
        return
      }

      const active = await createPlayer({
        canvas,
        document: result.document,
        framing: 'viewport',
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
      request.abort()
      player?.destroy()
    })
  })

  return (
    <div
      ref={(element) => (frame = element)}
      class="relative mx-auto h-88 w-full max-w-sm sm:h-112"
      role="img"
      aria-label="점술가 캐릭터"
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
  )
}
