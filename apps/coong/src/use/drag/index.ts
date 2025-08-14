import {createSignal, createEffect, onCleanup} from 'solid-js'
import {resolveAccessor, MaybeAccessor} from '@winter-love/solid-use'

export const useDrag = (element: MaybeAccessor<HTMLElement | null>) => {
  const elementAccessor = resolveAccessor(element)
  const [isDragging, setIsDragging] = createSignal(false)
  const [position, setPosition] = createSignal({x: 0, y: 0})

  let startX = 0
  let startY = 0

  const handleMouseDown = (e: MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)

    const element = elementAccessor()
    if (element) {
      startX = e.clientX - position().x
      startY = e.clientY - position().y
    }
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging()) return

    const newX = e.clientX - startX
    const newY = e.clientY - startY

    setPosition({x: newX, y: newY})
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // 엘리먼트 이벤트 handleMouseDown 연결
  createEffect(() => {
    const element = elementAccessor()
    if (element) {
      element.addEventListener('mousedown', handleMouseDown)
    }

    onCleanup(() => {
      element?.removeEventListener('mousedown', handleMouseDown)
    })
  })

  // 전역 마우스 이벤트 연결
  createEffect(() => {
    if (isDragging()) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)

      onCleanup(() => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      })
    }
  })

  return {
    isDragging,
    position,
  }
}
