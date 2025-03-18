import {Accessor, createContext, createSignal, ParentProps} from 'solid-js'
import {Position, Size} from '@winter-love/utils'

export interface ResizeCardContextValue {
  initSize: (element: HTMLElement) => void
  size: Accessor<Size>
  startResize: (position: Position) => void
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

export interface ResizeCardProviderProps extends ParentProps {
  onResize?: (size: Size) => void
}

export const ResizeCardProvider = (props: ResizeCardProviderProps) => {
  const [size, setSize] = createSignal<Size>({
    height: 0,
    width: 0,
  })

  let startPosition: Position | undefined
  let startSize: Size | undefined

  const initSize = (element: HTMLElement) => {
    setSize({
      height: element.offsetHeight,
      width: element.offsetWidth,
    })
  }

  const startResize = (position: Position) => {
    startPosition = {
      ...position,
    }
    const _size = size()

    startSize = {
      height: _size.height,
      width: _size.width,
    }
  }

  const updateSize = (position: Position) => {
    if (!startPosition || !startSize) {
      return
    }

    const x = position.x - startPosition.x
    const y = position.y - startPosition.y

    setSize({
      height: startSize.height + y,
      width: startSize.width + x,
    })
  }

  const stopResize = (position: Position) => {
    if (startPosition && startSize) {
      const x = position.x - startPosition.x
      const y = position.y - startPosition.y

      setSize({
        height: startSize.height + y,
        width: startSize.width + x,
      })
    }

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
