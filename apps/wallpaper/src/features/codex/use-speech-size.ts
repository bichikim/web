import {type Accessor, createMemo} from 'solid-js'
import {useElementRect} from '../speech'

interface SpeechSizeOptions {
  readonly viewport?: Accessor<HTMLElement | null>
}
const FRAME_PADDING = 48
const PIXEL_TOLERANCE = 1
/** Reports overflow without resizing the native screen canvas during movement. */
export const useSpeechSize = (
  element: Accessor<HTMLElement | null>,
  options: SpeechSizeOptions = {},
) => {
  const rect = useElementRect({element})
  const viewport = useElementRect({element: () => options.viewport?.() ?? null})
  const overflow = createMemo(() => {
    const bounds = rect()
    const frame = viewport()
    return (
      bounds !== null &&
      frame !== null &&
      bounds.height + FRAME_PADDING > frame.height + PIXEL_TOLERANCE
    )
  })
  return {overflow}
}
