import {Accessor, createEffect, onCleanup} from 'solid-js'
import {getDocument} from '@winter-love/utils'

const DEFAULT_GHOST_ANIMATION_DURATION_MS = 100

export interface DestroyGhostOptions {
  duration?: number
  easing?: string
  position?: {x: number; y: number}
}

export const createRenderGhost = (isActive: Accessor<boolean>) => {
  let ghostElement: (HTMLElement & {x: number; y: number}) | null = null
  let ghostAnimation: Animation | null = null
  let removedCallback: (() => void) | undefined

  const removeGhost = (notifyRemoved: boolean) => {
    const element = ghostElement
    const callback = removedCallback

    ghostAnimation?.cancel()
    ghostAnimation = null
    ghostElement = null
    removedCallback = undefined

    if (element) {
      element.ownerDocument.body.style.cursor = 'auto'
      element.remove()
    }

    if (notifyRemoved) {
      callback?.()
    }
  }

  onCleanup(() => {
    removeGhost(false)
  })

  createEffect(() => {
    if (!isActive()) {
      removeGhost(true)
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

      removeGhost(false)
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
        removed?.()

        return
      }

      ghostAnimation?.cancel()
      ghostAnimation = null
      removedCallback = undefined

      const position = options.position ?? {x: ghostElement.x, y: ghostElement.y}
      const element = ghostElement
      const animation = element.animate(
        {
          left: `${position.x}px`,
          top: `${position.y}px`,
        },
        {
          duration: options.duration ?? DEFAULT_GHOST_ANIMATION_DURATION_MS,
          easing: options.easing ?? 'ease-in-out',
        },
      )

      ghostAnimation = animation
      removedCallback = removed

      animation.addEventListener(
        'finish',
        () => {
          if (ghostAnimation !== animation) {
            return
          }

          ghostAnimation = null
          ghostElement = null
          removedCallback = undefined
          element.ownerDocument.body.style.cursor = 'auto'
          element.remove()
          removed?.()
        },
        {once: true},
      )
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
