import {
  Accessor,
  createContext,
  createEffect,
  createSignal,
  ParentProps,
  untrack,
} from 'solid-js'
import {Position, Size} from '@winter-love/utils'

export interface ResizeCardContextValue {
  initSize: (element: HTMLElement) => void
  size: Accessor<Partial<Size> | undefined>
  startResize: (position: Position, type: ResizeType) => void
  stopResize: (position: Position) => void
  updateSize: (position: Position) => void
}

export const ResizeCardContext = createContext<ResizeCardContextValue>({
  initSize: () => {
    console.warn('initSize is not implemented')
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

export type ResizeType =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'up-left'
  | 'up-right'
  | 'down-left'
  | 'down-right'

export interface ResizeCardProviderProps extends ParentProps {
  maxSize?: Partial<Size>
  minSize?: Partial<Size>
  onResize?: (size: Size) => void
  preventHeightResize?: boolean
  preventWidthResize?: boolean
}

export const ResizeCardProvider = (props: ResizeCardProviderProps) => {
  const [size, setSize] = createSignal<Partial<Size> | undefined>()

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

  // eslint-disable-next-line max-statements, complexity
  const updateSize = (position: Position) => {
    const _maxSize = props.maxSize
    const _minSize = props.minSize

    if (!startPosition || !startSize) {
      return
    }
    let addX = 0
    let addY = 0

    switch (updateType) {
      case 'up': {
        addY = -1
        addX = 0
        break
      }

      case 'down': {
        addY = 1
        addX = 0
        break
      }

      case 'left': {
        addX = -1
        addY = 0
        break
      }

      case 'right': {
        addX = 1
        addY = 0
        break
      }

      case 'up-left': {
        addX = -1
        addY = -1
        break
      }

      case 'up-right': {
        addX = 1
        addY = -1
        break
      }

      case 'down-left': {
        addX = -1
        addY = 1
        break
      }

      case 'down-right': {
        addX = 1
        addY = 1
        break
      }
    }
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
    <ResizeCardContext.Provider
      value={{initSize, size, startResize, stopResize, updateSize}}
    >
      {props.children}
    </ResizeCardContext.Provider>
  )
}
