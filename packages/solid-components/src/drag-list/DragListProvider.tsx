import {createContext, ParentProps, Accessor, createSignal, createMemo, createEffect, untrack} from 'solid-js'

export interface DragListProviderProps<T extends readonly any[]> extends ParentProps {
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
   * 라스트에 객체아이탬이 (포인트 포함)변경 될경우 포인트 비교일 경우 드레그 지점을 잃어 버릴 수 있다
   * 이럴 때는 반드시 idDetector를 사용하여 객체 비교를 하여 드레그 지점을 유지할 수 있도록 해야한다
   * @param item
   * @returns
   */
  idDetector?: (item: any) => any
  list: T
  //
  onChangeList?: (from: number, to: number, list: T) => void
}

export interface DragListContextProps {
  dragOverIndex: Accessor<number | null>
  draggingIndex: Accessor<number | null>
  /**
   * Animation duration in milliseconds when a dragged item is released
   */
  duration: Accessor<number>
  /**
   * Animation easing function when a dragged item is released
   */
  easing: Accessor<string>

  /**
   * The list of items to be rendered
   */
  list: Accessor<readonly any[]>

  /**
   * Called when dragging ends on an item.
   * @returns void
   */
  onDragEnd: () => void

  /**
   * Called when an item is dragged over another item.
   * @param index - The index of the item being dragged over
   */
  onDragOver: (index: number) => void

  /**
   * Called when dragging starts on an item.
   * @param index - The index of the item being dragged
   */
  onDragStart: (index: number) => void
}

export const DragListContext = createContext<DragListContextProps>()

export const DragListProvider = <T extends readonly any[]>(props: DragListProviderProps<T>) => {
  const [draggingIndex, setDraggingIndex] = createSignal<number | null>(null)
  /**
   * 드레드 되는 아이템의 idDetector 를 통한 id 또는 item 참조 저장
   */
  const [draggingItem, setDraggingItem] = createSignal<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = createSignal<number | null>(null)

  /**
   * idDetecting 방법인 함수가 바뀌면 setDraggingItem 을 변경 한다
   */
  createEffect(() => {
    const _idDetector = props.idDetector
    const _draggingIndex = untrack(() => draggingIndex())

    if (_draggingIndex === null) {
      return
    }

    if (_idDetector) {
      setDraggingItem(_idDetector(props.list[_draggingIndex]))
    } else {
      setDraggingItem(props.list[_draggingIndex])
    }
  })

  /**
   * 드레그 중이면서 list 가 변경 될 경우 드레그 중인 아이템의 인덱스를 찾아 드레그 중인 아이템의 인덱스를 업데이트 한다
   */
  createEffect(() => {
    const _list = [...props.list]
    const _draggingIndex = draggingIndex()
    const _draggingItem = draggingItem()
    const _idDetector = untrack(() => props.idDetector)

    /**
     * 드레그 중이 아니라면
     */
    if (_draggingIndex === null || _draggingItem === null) {
      return
    }

    const maybeDraggingItem = _list[_draggingIndex]
    const maybeDraggingItemId = _idDetector ? _idDetector(maybeDraggingItem) : maybeDraggingItem

    if (maybeDraggingItemId === _draggingItem) {
      return
    }

    const targetIndex = _idDetector
      ? _list.findIndex((item) => _idDetector(item) === _draggingItem)
      : _list.indexOf(_draggingItem)

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

  /**
   * Stores the index of the item being dragged.
   * Also stores the item itself to track it if the parent list updates.
   * @param index - The index of the item being dragged
   */
  const handleDragStart = (index: number) => {
    setDraggingIndex(index)

    const item = props.list[index]
    const _idDetector = props.idDetector

    if (_idDetector) {
      setDraggingItem(_idDetector(item))
    } else {
      setDraggingItem(item)
    }
  }

  /**
   * Stores the index where the item will be inserted while dragging.
   * @param index - The index to set as the drag over position
   */
  const handleDragOver = (index: number) => {
    setDragOverIndex(index)
  }

  /**
   * When the drag operation ends, this function sends the updated list order
   * to the parent component via onChangeList for rendering.
   * @returns void
   */
  const handleDragEnd = () => {
    const _draggingIndex = draggingIndex()
    const _dragOverIndex = dragOverIndex()
    const _tempList = tempList()

    /**
     * If there is no valid dragging index, drag over index, or temporary list,
     * do not proceed with the drag end operation.
     */
    if (_draggingIndex === null || _dragOverIndex === null || _tempList === null) {
      return
    }

    /**
     * Notify parent of the new list order and reset drag state.
     */
    if (typeof props.onChangeList === 'function') {
      props.onChangeList(_draggingIndex, _dragOverIndex, _tempList)
    }

    // Reset dragging item index
    setDraggingIndex(null)
    // Reset drag over index
    setDragOverIndex(null)
  }

  /**
   * Returns the list of items to be rendered.
   * If a drag-over state is active, returns the temporary reordered list.
   * Otherwise, returns the original list.
   */
  const list = createMemo(() => {
    const _tempList = tempList()

    return _tempList ?? props.list
  })

  /**
   * Accessor functions for providing context values
   */
  const duration = createMemo(() => {
    return props.duration ?? 100
  })

  /**
   * Accessor functions for providing context values
   */
  const easing = createMemo(() => {
    return props.easing ?? 'ease-in-out'
  })

  return (
    <DragListContext.Provider
      value={{
        dragOverIndex,
        draggingIndex,
        duration,
        easing,
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
