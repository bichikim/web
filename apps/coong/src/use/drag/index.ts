import {createEffect, createSignal, onCleanup} from 'solid-js'

export const useDrag = () => {
  const [isDragging, setIsDragging] = createSignal(false)
  const [position, setPosition] = createSignal({x: 0, y: 0})

  let startX = 0
  let startY = 0

  const handleMouseDown = (event: MouseEvent) => {
    event.preventDefault()
    setIsDragging(true)

    startX = event.clientX - position().x
    startY = event.clientY - position().y
  }

  const handleMouseMove = (event: MouseEvent) => {
    if (!isDragging()) {
      return
    }

    const newX = event.clientX - startX
    const newY = event.clientY - startY

    setPosition({x: newX, y: newY})
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

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
    onMouseDown: handleMouseDown,
    position,
  }
}
