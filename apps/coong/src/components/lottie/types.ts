import type {JSX} from 'solid-js'
import type {AnimationItem} from 'lottie-web'

export interface LottieSharedProps {
  fallback?: JSX.Element
  loop?: boolean
  onDataReady?: () => void
  onPlay?: (value: boolean) => void
  play?: boolean | 'autoplay'
  speed?: number
  src: string
}
