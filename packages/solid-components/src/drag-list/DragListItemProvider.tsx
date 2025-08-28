import {DragListContext} from './DragListProvider'
import {
  ParentProps,
  useContext,
  createContext,
  ValidComponent,
  splitProps,
  createMemo,
  Accessor,
  createSignal,
  onCleanup,
} from 'solid-js'
import {DynamicProps, Dynamic} from 'solid-js/web'
import {useEvent} from '@winter-love/solid-use'
import {getWindow} from '@winter-love/utils'

export interface DragListItemInnerProps {
  //
  index: number
  value: any
}

export type DragListItemProviderProps = ParentProps & DragListItemInnerProps

export interface DragListItemContextProps {
  index: Accessor<number>
  isDragging: Accessor<boolean>
  onDrag: (event: MouseEvent) => void
  onDragEnd: (event: MouseEvent, itemElement: HTMLElement) => void
  onDragOver: (event: MouseEvent) => void
  onDragStart: (event: MouseEvent) => void
  //
  value: Accessor<any>
}

export const DragListItemContext = createContext<DragListItemContextProps>()

export const DragListItemProvider = <T extends ValidComponent>(props: DragListItemProviderProps) => {
  const [isDragging, setIsDragging] = createSignal(false)
  const [innerProps, dynamicProps] = splitProps(props, ['index'])
  const context = useContext(DragListContext)
  let ghostElement: HTMLElement | null = null

  const handleDragStart = (event: MouseEvent) => {
    if (isDragging()) {
      return
    }

    context?.onDragStart(innerProps.index)

    const element = (event.target as HTMLElement).cloneNode(true) as HTMLElement

    ghostElement = element
    document.body.appendChild(element)
    element.style.position = 'fixed'
    element.style.top = '0'
    element.style.left = '0'
    // prevent make ghost
    element.style.opacity = '0'
    element.style.pointerEvents = 'none'
    element.dataset.x = `${event.offsetX}`
    element.dataset.y = `${event.offsetY}`
    element.style.transition = 'none'
  }

  // const isDragging = createMemo(() => {
  //   return context?.draggingIndex() === innerProps.index
  // })

  const handleDragOver = (event: MouseEvent) => {
    context?.onDragOver(props.index)
  }

  const handleDragEnd = (event: MouseEvent, itemElement: HTMLElement) => {
    context?.onDragEnd()

    if (ghostElement) {
      const x = parseInt(ghostElement.dataset.x ?? '0')
      const y = parseInt(ghostElement.dataset.y ?? '0')
      const duration = context?.duration() ?? 100
      const easing = context?.easing() ?? 'ease-in-out'
      const rect = itemElement.getBoundingClientRect()

      const element = ghostElement

      element
        .animate(
          {
            left: `${rect.x}px`,
            top: `${rect.y}px`,
          },
          {
            duration,
            easing,
          },
        )
        .addEventListener('finish', () => {
          element.remove()
          setIsDragging(false)
        })
    }

    ghostElement = null
  }

  const index = createMemo(() => {
    return props.index
  })

  const value = createMemo(() => {
    return props.value
  })

  const handleDrag = (event: MouseEvent) => {
    setIsDragging(true)
    const x = parseInt(ghostElement?.dataset.x ?? '0')
    const y = parseInt(ghostElement?.dataset.y ?? '0')

    if (ghostElement) {
      ghostElement.style.opacity = '1'
      ghostElement.style.top = `${event.clientY - y}px`
      ghostElement.style.left = `${event.clientX - x}px`
    }
  }

  onCleanup(() => {
    if (ghostElement) {
      ghostElement.remove()
    }
  })

  return (
    <DragListItemContext.Provider
      value={{
        index,
        isDragging,
        onDrag: handleDrag,
        onDragEnd: handleDragEnd,
        onDragOver: handleDragOver,
        onDragStart: handleDragStart,
        value,
      }}
    >
      {props.children}
    </DragListItemContext.Provider>
  )
}
