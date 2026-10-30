import {type Accessor, createEffect, createSignal, on, onCleanup} from 'solid-js'
import type {useWidgetPreview} from '.'
import type {CharacterHitTest} from '../character-preview/types'

interface UseWidgetInteractionProps {
  /** 인터랙티브 위젯의 이동과 키보드 동작. */
  readonly preview: Accessor<
    Pick<
      ReturnType<typeof useWidgetPreview>,
      'press' | 'move' | 'release' | 'dragging' | 'keyboard'
    >
  >
  /** 소개 장면이 조작을 잠그는지 반환한다. */
  readonly locked: Accessor<boolean>
  /** 포인터 캡처를 소유하는 버튼. */
  readonly button: Accessor<HTMLButtonElement | null>
  /** 현재 렌더링된 캐릭터의 픽셀 검사. 로딩 중에는 null이다. */
  readonly hitTest: Accessor<CharacterHitTest | null>
}

export const useWidgetInteraction = (props: UseWidgetInteractionProps) => {
  const OFFSET_X = 12
  const OFFSET_Y = 20
  const [pointer, setPointer] = createSignal<{readonly x: number; readonly y: number} | null>(null)
  const [hovered, setHovered] = createSignal(false)
  let restingPointer: PointerEvent | null = null
  let capturedPointer: number | null = null
  const tooltip = () => (props.locked() || props.preview().dragging() ? null : pointer())
  const handlePress = (event: PointerEvent & {currentTarget: HTMLButtonElement}) => {
    if (!props.locked() && event.button === 0 && props.hitTest()?.(event) === true) {
      event.preventDefault()
      event.currentTarget.focus({preventScroll: true})
      capturedPointer = event.pointerId
      props.preview().press(event)
    }
  }
  const handleHover = (event: PointerEvent) => {
    restingPointer = event
    const over = !props.locked() && props.hitTest()?.(event) === true
    setHovered(over)
    if (over && event.pointerType !== 'touch') {
      setPointer({x: event.clientX + OFFSET_X, y: event.clientY + OFFSET_Y})
    } else {
      setPointer(null)
    }
  }
  const handleMove = (event: PointerEvent & {currentTarget: HTMLButtonElement}) => {
    if (props.locked()) {
      return
    }
    props.preview().move(event)
    if (!props.preview().dragging()) {
      handleHover(event)
    }
  }
  const handleLeave = () => {
    restingPointer = null
    setHovered(false)
    setPointer(null)
  }
  createEffect(
    on(props.hitTest, () => {
      if (restingPointer === null) {
        return
      }
      // 첫 렌더 알림은 픽셀 검사 초기화보다 먼저 도착할 수 있다.
      const frame = requestAnimationFrame(() => {
        if (restingPointer !== null && !props.preview().dragging()) {
          handleHover(restingPointer)
        }
      })
      onCleanup(() => cancelAnimationFrame(frame))
    }),
  )
  createEffect(() => {
    if (!props.locked()) {
      return
    }
    const element = props.button()
    if (capturedPointer !== null && element?.hasPointerCapture(capturedPointer)) {
      element.releasePointerCapture(capturedPointer)
    }
    capturedPointer = null
    props.preview().release()
    restingPointer = null
    setPointer(null)
  })
  const handleFocus = (event: FocusEvent & {currentTarget: HTMLButtonElement}) => {
    if (event.currentTarget.matches(':focus-visible')) {
      restingPointer = null
      const bounds = event.currentTarget.getBoundingClientRect()
      setPointer({x: bounds.left + bounds.width / 2, y: bounds.top + OFFSET_Y})
    }
  }
  const handleKeyDown = (event: KeyboardEvent & {currentTarget: HTMLButtonElement}) => {
    props.preview().keyboard(event)
    if (event.key === 'Escape') {
      restingPointer = null
      setPointer(null)
    }
  }
  return {
    handleFocus,
    handleHover,
    handleKeyDown,
    handleLeave,
    handleMove,
    handlePress,
    hovered,
    tooltip,
  }
}
