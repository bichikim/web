import {createSignal} from 'solid-js'
import {useAnimatedBackground} from '../features/animated-background'

interface SAnimatedBackdropProps {
  readonly model?: string
  readonly label?: string
  /** Pause a retained background while another scene is visible. */
  readonly playing?: boolean
  /** Crop alignment; omitted centers the background vertically. */
  readonly verticalAlign?: 'top' | 'center'
}

export default function SAnimatedBackdrop(props: SAnimatedBackdropProps) {
  const [host, setHost] = createSignal<HTMLDivElement | null>(null)
  const [canvas, setCanvas] = createSignal<HTMLCanvasElement | null>(null)
  const background = useAnimatedBackground({
    canvas,
    host,
    playing: () => props.playing !== false,
    source: () => props.model ?? '/models/profile/model.poffo',
    verticalAlign: () => props.verticalAlign ?? 'center',
  })
  return (
    <div
      ref={setHost}
      class="absolute inset-0 opacity-0 transition-opacity duration-500"
      classList={{'opacity-100': background.ready()}}
    >
      <canvas
        ref={setCanvas}
        aria-label={props.label ?? '움직이는 프로필 배경'}
        class="block h-full w-full"
      />
    </div>
  )
}
