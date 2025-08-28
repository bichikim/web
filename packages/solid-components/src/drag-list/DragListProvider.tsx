import {createContext, ParentProps, Accessor, createSignal, createMemo, createEffect} from 'solid-js'

export interface DragListProviderProps<T extends readonly any[]> extends ParentProps {
  direction: 'vertical' | 'horizontal'
  /**
   * @default 100ms
   */
  duration?: number
  /**
   * @default ease-in-out
   */
  easing?: string
  /**
   * 이 함수가 주어 지지 않으면 객체일경우 포인트 비교 값일 경우 값비교를 한다
   * @param item
   * @returns
   */
  idDetector?: (item: any) => any
  list: T
  //
  onChangeList?: (from: number, to: number, list: T) => void
}

export interface DragListContextProps {
  direction: Accessor<'vertical' | 'horizontal'>
  dragOverIndex: Accessor<number | null>
  draggingIndex: Accessor<number | null>
  duration: Accessor<number>
  easing: Accessor<string>
  length: Accessor<number>
  list: Accessor<readonly any[]>
  //
  onDragEnd: () => void
  /**
   * 0 before 면 잴 앞에
   * length before 면 잴 뒤에
   * @param before
   * @returns
   */
  onDragOver: (before: number) => void
  onDragStart: (index: number) => void
  //
}

export const DragListContext = createContext<DragListContextProps>()

export const DragListProvider = <T extends readonly any[]>(props: DragListProviderProps<T>) => {
  const [draggingIndex, setDraggingIndex] = createSignal<number | null>(null)
  const [draggingItem, setDraggingItem] = createSignal<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = createSignal<number | null>(null)

  createEffect(() => {
    const _list = [...props.list]
    const _draggingIndex = draggingIndex()
    const _draggingItem = draggingItem()

    if (_draggingIndex === null || _draggingItem === null) {
      return
    }

    const maybeDraggingItem = _list[_draggingIndex]

    if (maybeDraggingItem === _draggingItem) {
      return
    }

    const targetIndex = _list.indexOf(_draggingItem)

    if (targetIndex === -1) {
      setDraggingIndex(null)
      setDraggingItem(null)

      return
    }

    setDraggingIndex(targetIndex)
  })

  // 임시 변경 배열
  const tempList = createMemo((): T | null => {
    const _list = [...props.list]
    const _draggingIndex = draggingIndex()
    const _dragOverIndex = dragOverIndex()

    if (_draggingIndex === null || _dragOverIndex === null) {
      return null
    }

    const targetItem = _list.splice(_draggingIndex, 1)[0]

    _list.splice(_dragOverIndex, 0, targetItem)

    return _list as unknown as T
  })

  const handleDragStart = (index: number) => {
    setDraggingIndex(index)
    setDraggingItem(props.list[index])
  }

  const handleDragOver = (index: number) => {
    setDragOverIndex(index)
  }

  const handleDragEnd = () => {
    const _draggingIndex = draggingIndex()
    const _dragOverIndex = dragOverIndex()
    const _tempList = tempList()

    if (_draggingIndex === null || _dragOverIndex === null || _tempList === null) {
      return
    }

    props.onChangeList?.(_draggingIndex, _dragOverIndex, _tempList)
    setDraggingIndex(null)
    setDragOverIndex(null)
  }

  const direction = createMemo(() => {
    return props.direction
  })

  const length = createMemo(() => {
    return props.list.length
  })

  const list = createMemo(() => {
    const _tempList = tempList()

    return _tempList ?? props.list
  })

  const duration = createMemo(() => {
    return props.duration ?? 100
  })

  const easing = createMemo(() => {
    return props.easing ?? 'ease-in-out'
  })

  return (
    <DragListContext.Provider
      value={{
        direction,
        dragOverIndex,
        draggingIndex,
        duration,
        easing,
        length,
        list,
        onDragEnd: handleDragEnd,
        onDragOver: handleDragOver,
        onDragStart: handleDragStart,
      }}
    >
      {props.children}
    </DragListContext.Provider>
  )
}
