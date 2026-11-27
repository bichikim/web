import {createEffect, createSignal, untrack} from 'solid-js'
import {useCharacterPreview} from '../features/character-preview'
import type {MouthPose} from '../features/character-speech/types'
import type {CharacterHitTest} from '../features/character-preview/types'

interface SPuppetCharacterProps {
  readonly coatOff?: boolean
  readonly expressionId?: string | null
  readonly mouth?: MouthPose | null
  readonly motionId?: string
  readonly playing?: boolean
  readonly tracking?: boolean
  readonly onReady?: (hitTest: CharacterHitTest) => void
  readonly onError?: () => void
}

export default function SPuppetCharacter(props: SPuppetCharacterProps) {
  const [canvas, setCanvas] = createSignal<HTMLCanvasElement | null>(null)
  const preview = useCharacterPreview({
    canvas,
    coatOff: () => props.coatOff ?? false,
    expressionId: () => props.expressionId ?? null,
    motionId: () => props.motionId ?? 'Idle:0',
    mouth: () => props.mouth ?? null,
    onError: () => props.onError?.(),
    onReady: () => props.onReady?.(preview.hitTest),
    playing: () => props.playing ?? true,
  })
  const handleLook = (event: PointerEvent) => {
    if (props.tracking === false) {
      return
    }
    preview.lookAt({x: event.clientX, y: event.clientY})
  }
  const handleLeave = () => preview.lookAt()
  createEffect(
    () => props.tracking === false,
    (trackingDisabled) => {
      if (trackingDisabled) {
        untrack(handleLeave)
      }
    },
  )
  createEffect(canvas, (element) => {
    if (element === null || element.parentElement === null) {
      return
    }
    const observer = new ResizeObserver(() => preview.resize())
    observer.observe(element.parentElement)
    const owner = element.ownerDocument
    const view = owner.defaultView
    const subscription = new AbortController()
    const {signal} = subscription
    view?.addEventListener('pointermove', handleLook, {capture: true, passive: true, signal})
    owner.addEventListener('pointerleave', handleLeave, {signal})
    view?.addEventListener('blur', handleLeave, {signal})
    return () => {
      observer.disconnect()
      subscription.abort()
    }
  })
  return (
    <canvas ref={setCanvas} aria-label="흰 고양이 캐릭터 실시간 렌더링" class="h-full w-full" />
  )
}
