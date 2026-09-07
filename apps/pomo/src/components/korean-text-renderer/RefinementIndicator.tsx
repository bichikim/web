import {createSignal, onCleanup, onMount} from 'solid-js'

const REFINEMENT_FRAMES = ['뷁뚱', '휵쟝', '먕귱', '륭쫑'] as const

const FRAME_INTERVAL = 120

export const RefinementIndicator = () => {
  const [frame, setFrame] = createSignal(0)

  onMount(() => {
    const interval = window.setInterval(() => {
      setFrame((value) => (value + 1) % REFINEMENT_FRAMES.length)
    }, FRAME_INTERVAL)
    onCleanup(() => window.clearInterval(interval))
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
