import {resolveAccessor} from 'src/resolve-accessor'
import {Accessor, createMemo, createSignal, createEffect} from 'solid-js'
import {MayBeAccessor} from 'src/types'
import {getDocument, getWindow} from '@winter-love/utils'
import {useEvent} from 'src/event'
import {toggleValue} from 'src/toggle-value'

export const elementsFromPoint = (x: number, y: number): Element[] => {
  return getDocument()?.elementsFromPoint(x, y) ?? []
}

export const createUseTouchMove = (identifyName: string | symbol) => {
  const [listeners, setListeners] = createSignal<Map<Element, (isDown: boolean) => void>>(new Map())
  const isActive = createMemo(() => {
    return listeners().size > 0
  })
  let prevActiveMap: Record<number, (isDown: boolean) => void> = {}

  useEvent(toggleValue(getWindow, isActive, null), 'touchmove', (event) => {
    const prevIndexList = new Set(Object.keys(prevActiveMap))
    const _listeners = listeners()
    const touches = event.targetTouches
    const touchLength = touches.length
    for (let index = 0; index < touchLength; index += 1) {
      const touch = touches[index]
      const isInside = elementsFromPoint(touch.clientX, touch.clientY).find((element) => {
        return typeof element[identifyName]
      })
      if (!isInside) {
        return
      }
      const listener = _listeners.get(isInside)
      if (listener) {
        const prevListener = prevActiveMap[String(touch.identifier)]
        if (listener !== prevListener) {
          prevListener?.(false)
          prevActiveMap[String(touch.identifier)] = listener
          listener(true)
        }
        prevIndexList.delete(String(touch.identifier))
      }
    }
    prevIndexList.forEach((index) => {
      const prevListener = prevActiveMap[index]
      prevActiveMap[index] = undefined
      prevListener?.(false)
    })
  })

  useEvent(getWindow(), 'touchend', () => {
    Object.values(prevActiveMap).map((listener) => {
      listener(false)
    })
    prevActiveMap = {}
  })

  return (element: MayBeAccessor<Element | null>, listener: (isDown: boolean) => void) => {
    const getElement = resolveAccessor(element)

    createEffect(() => {
      const element = getElement()
      if (!element) {
        return
      }

      setListeners((value) => {
        value.set(element, listener)
        return new Map(value)
      })
      return () => {
        setListeners((value) => {
          value.delete(element)
          return new Map(value)
        })
      }
    })

    return identifyName
  }
}

const TOUCH_DOWN_HOVER = Symbol('touch-down-hover')

const useTouchMove = createUseTouchMove(TOUCH_DOWN_HOVER)

export const useTouchDownHover = (
  element: MayBeAccessor<HTMLElement | null>,
): Accessor<boolean> => {
  const getElement = resolveAccessor(element)
  const [downIdentifier, setDownIdentifier] = createSignal(-1)
  const [isDown, setIsDown] = createSignal(false)

  useEvent(getElement, 'touchstart', (event: TouchEvent) => {
    setIsDown(true)
  })

  useEvent(toggleValue(getWindow, isDown, null), 'touchend', (event: TouchEvent) => {
    setIsDown(false)
  })

  createEffect(() => {
    const element = getElement()
    if (!element) {
      return
    }
    element[TOUCH_DOWN_HOVER] = true
    return () => {
      element[TOUCH_DOWN_HOVER] = false
    }
  })

  useTouchMove(getElement, (isDown) => {
    setIsDown(isDown)
  })

  return isDown
}
