import {createSignal, onMount} from 'solid-js'
import {createAnimationLoop} from '@winter-love/solid-use/animation-loop'

const REFINEMENT_FRAMES = ['뷁뚱', '휵쟝', '먕귱', '륭쫑'] as const

const FRAME_INTERVAL = 120

export const RefinementIndicator = () => {
  const [frame, setFrame] = createSignal(0)

  onMount(() => {
    const startedAt = Date.now()
    const animation = createAnimationLoop()
    animation.start(() => {
      try {
        const elapsed = Date.now() - startedAt
        setFrame(Math.floor(elapsed / FRAME_INTERVAL) % REFINEMENT_FRAMES.length)
      } catch (error) {
        // Preserve the consumer's stop-on-error policy; the shared loop otherwise continues.
        animation.stop()
        throw error
      }
    })
  })

  return (
    <span aria-label="답변을 수정하는 중" role="status">
      <span
        aria-hidden="true"
        class="inline-block min-w-10 animate-pulse select-none font-mono text-#b8e8d0/75 blur-[0.0375rem]"
      >
        {REFINEMENT_FRAMES[frame()]}
      </span>
    </span>
  )
}
