import {Accessor, onCleanup, createEffect} from 'solid-js'
import {getDocument} from '@winter-love/utils'

export interface DestroyGhostOptions {
  duration?: number
  easing?: string
  position?: {x: number; y: number}
}

export const createRenderGhost = (isActive: Accessor<boolean>) => {
  let ghostElement: (HTMLElement & {x: number; y: number}) | null = null

  const handleCleanup = () => {
    if (ghostElement) {
      document.body.style.cursor = 'auto'
      ghostElement.remove()
    }
  }

  onCleanup(handleCleanup)

  createEffect(() => {
    if (!isActive()) {
      handleCleanup()
    }
  })

  return {
    create: (element: HTMLElement, relativePosition: {x: number; y: number}) => {
      if (!isActive()) {
        return
      }

      const document = getDocument()

      if (!document) {
        return
      }

      ghostElement = element.cloneNode(true) as HTMLElement & {x: number; y: number}
      ghostElement.x = relativePosition.x
      ghostElement.y = relativePosition.y
      ghostElement.style.left = '0'
      ghostElement.style.top = '0'
      ghostElement.style.opacity = '0'
      ghostElement.style.pointerEvents = 'none'
      ghostElement.style.transition = 'none'
      ghostElement.style.position = 'fixed'
      document.body.style.cursor = 'grabbing'
      document.body.appendChild(ghostElement)
    },
    destroy: (options: DestroyGhostOptions, removed?: () => void) => {
      if (!isActive()) {
        removed?.()

        return
      }

      if (!ghostElement) {
        return
      }
      const position = options.position ?? {x: ghostElement.x, y: ghostElement.y}
      const element = ghostElement

      element
        .animate(
          {
            left: `${position.x}px`,
            top: `${position.y}px`,
          },
          {
            duration: options.duration ?? 100,
            easing: options.easing ?? 'ease-in-out',
          },
        )
        .addEventListener('finish', () => {
          document.body.style.cursor = 'auto'
          element.remove()
          removed?.()
        })
      ghostElement = null
    },
    update: (position: {x: number; y: number}) => {
      if (!isActive()) {
        return
      }

      if (!ghostElement) {
        return
      }

      ghostElement.style.left = `${position.x - ghostElement.x}px`
      ghostElement.style.top = `${position.y - ghostElement.y}px`
      ghostElement.style.opacity = '1'
    },
  }
}
