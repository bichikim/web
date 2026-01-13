import {Accessor, createContext, createEffect, createSignal, ParentProps, untrack} from 'solid-js'
import {Position, Size} from '@winter-love/utils'
import {getResizeDelta, type ResizeType} from './resize-delta'

export interface ResizeCardContextValue {
  setElement: (element: HTMLElement | undefined) => void
  size: Accessor<Partial<Size> | undefined>
  startResize: (position: Position, type: ResizeType) => void
  stopResize: (position: Position) => void
  updateSize: (position: Position) => void
}

export const ResizeCardContext = createContext<ResizeCardContextValue>({
  setElement: () => {
    console.warn('setElement is not implemented')
  },
  size: () => ({
    height: 0,
    width: 0,
  }),
  startResize: () => {
    console.warn('startResize is not implemented')
  },
  stopResize: () => {
    console.warn('stopResize is not implemented')
  },
  updateSize: () => {
    console.warn('updateSize is not implemented')
  },
})

export type {ResizeType} from './resize-delta'

export interface ResizeCardProviderProps extends ParentProps {
  maxSize?: Partial<Size>
  minSize?: Partial<Size>
  onResize?: (size: Size) => void
  preventHeightResize?: boolean
  preventWidthResize?: boolean
}

export const ResizeCardProvider = (props: ResizeCardProviderProps) => {
  const [size, setSize] = createSignal<Partial<Size> | undefined>()
  const [element, setElement] = createSignal<HTMLElement | undefined>()

  let startPosition: Position | undefined
  let startSize: Partial<Size> | undefined
  let updateType: ResizeType | undefined

  const initSize = (element: HTMLElement) => {
    setSize({
      height: props.preventHeightResize ? undefined : element.offsetHeight,
      width: props.preventWidthResize ? undefined : element.offsetWidth,
    })
  }

  createEffect(() => {
    const _maxSize = props.maxSize
    const _minSize = props.minSize

    untrack(() => {
      let width = size()?.width ?? 0
      let height = size()?.height ?? 0

      if (_minSize?.height) {
        height = Math.max(height, _minSize.height)
      }

      if (_minSize?.width) {
        width = Math.max(width, _minSize.width)
      }

      if (_maxSize?.height) {
        height = Math.min(height, _maxSize.height)
      }

      if (_maxSize?.width) {
        width = Math.min(width, _maxSize.width)
      }

      setSize({
        height: props.preventHeightResize ? undefined : height,
        width: props.preventWidthResize ? undefined : width,
      })
    })
  })

  const startResize = (position: Position, type: ResizeType) => {
    const element_ = element()

    if (!element_) {
      return
    }

    initSize(element_)

    const _size = size()

    if (!_size) {
      return
    }

    startPosition = {
      ...position,
    }

    startSize = {
      height: _size.height,
      width: _size.width,
    }
    updateType = type
  }

  const updateSize = (position: Position) => {
    const _maxSize = props.maxSize
    const _minSize = props.minSize

    if (!startPosition || !startSize) {
      return
    }
    const {addX, addY} = getResizeDelta(updateType)
    const x = position.x - startPosition.x
    const y = position.y - startPosition.y
    let height = (startSize.height ?? 0) + y * addY
    let width = (startSize.width ?? 0) + x * addX

    if (_minSize?.height) {
      height = Math.max(height, _minSize.height)
    }

    if (_minSize?.width) {
      width = Math.max(width, _minSize.width)
    }

    if (_maxSize?.height) {
      height = Math.min(height, _maxSize.height)
    }

    if (_maxSize?.width) {
      width = Math.min(width, _maxSize.width)
    }

    setSize({
      height: props.preventHeightResize ? undefined : height,
      width: props.preventWidthResize ? undefined : width,
    })
  }

  const stopResize = (position: Position) => {
    updateSize(position)
    startPosition = undefined
    startSize = undefined
  }

  return (
    <ResizeCardContext.Provider value={{setElement, size, startResize, stopResize, updateSize}}>
      {props.children}
    </ResizeCardContext.Provider>
  )
}
