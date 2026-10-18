import {type Accessor, createSignal} from 'solid-js'
import type {EditorContextMenuEntry} from './EditorContextMenu'
import {
  getFrame,
  isKeyframeSelected,
  type KeyframeSelection,
  type ParameterTimelineKeyframe,
  type ParameterTimelineTrack,
} from './timeline-keyframe-selection'

export interface TimelineTrackSource {
  readonly currentTime: number
  readonly duration: number
  readonly framesPerSecond: number
  readonly getTime: (clientX: number, bounds: DOMRect) => number
  readonly onKeyframeAdd?: (track: ParameterTimelineTrack, time: number) => boolean
  readonly onKeyframesDelete?: (
    track: ParameterTimelineTrack,
    times: ReadonlyArray<number>,
  ) => boolean
  readonly onKeyframeSelect?: (
    track: ParameterTimelineTrack,
    keyframe: ParameterTimelineKeyframe,
    extend: boolean,
  ) => void
  readonly onSeek?: (time: number, preferredParameterId?: string) => void
  readonly selection: KeyframeSelection | null
  readonly track: ParameterTimelineTrack
}

export interface UseTimelineTrackOptions {
  readonly source: Accessor<TimelineTrackSource>
}

const requestKeyboardContextMenu = (
  source: TimelineTrackSource,
  event: KeyboardEvent & {currentTarget: HTMLDivElement},
) => {
  if (
    event.defaultPrevented ||
    event.repeat ||
    event.isComposing ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    (source.onKeyframeAdd === undefined && source.onKeyframesDelete === undefined)
  ) {
    return
  }
  const target = event.target instanceof HTMLElement ? event.target : event.currentTarget
  const bounds = target.getBoundingClientRect()
  const progress = source.duration === 0 ? 0 : source.currentTime / source.duration
  const offset = target === event.currentTarget ? bounds.width * progress : bounds.width / 2
  const clientX = bounds.left + offset
  event.preventDefault()
  event.stopPropagation()
  target.dispatchEvent(
    new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      clientX,
      clientY: bounds.top + bounds.height / 2,
      composed: true,
    }),
  )
}

export const useTimelineTrack = (options: UseTimelineTrackOptions) => {
  const [requestedTime, setRequestedTime] = createSignal<number | null>(null)
  const [interactedOutside, setInteractedOutside] = createSignal(false)
  const keyframeAt = (time: number) => {
    const source = options.source()
    return source.track.keyframes.find(
      (keyframe) =>
        getFrame(keyframe.time, source.framesPerSecond) === getFrame(time, source.framesPerSecond),
    )
  }
  const selectedTimes = () => {
    const source = options.source()
    return source.selection?.parameterId === source.track.parameter.id
      ? source.selection.times.filter((time) =>
          source.track.keyframes.some((keyframe) => keyframe.time === time),
        )
      : []
  }
  const selectTime = (time: number) => {
    const source = options.source()
    const keyframe = keyframeAt(time)
    if (keyframe === undefined) {
      source.onSeek?.(time, source.track.parameter.id)
    } else if (!isKeyframeSelected(source.selection, source.track.parameter.id, keyframe.time)) {
      source.onKeyframeSelect?.(source.track, keyframe, false)
    }
  }
  const prepareContextMenu = (time: number) => {
    setRequestedTime(time)
    selectTime(time)
  }
  const addKeyframe = (time: number) => {
    const source = options.source()
    if (keyframeAt(time) === undefined && source.onKeyframeAdd?.(source.track, time) === true) {
      source.onKeyframeSelect?.(source.track, {easing: 'linear', time}, false)
    }
  }
  const deleteKeyframes = () => {
    const source = options.source()
    const times = selectedTimes()
    return times.length > 0 && source.onKeyframesDelete?.(source.track, times) === true
  }
  const contextEntries = (): ReadonlyArray<EditorContextMenuEntry> => {
    const source = options.source()
    const time = requestedTime() ?? source.currentTime
    const keyframe = keyframeAt(time)
    if (keyframe === undefined) {
      return source.onKeyframeAdd === undefined
        ? []
        : [
            {
              id: 'add-keyframe',
              label: '키프레임 추가',
              onSelect: () => addKeyframe(time),
              type: 'action',
            },
          ]
    }
    const count = selectedTimes().length
    return source.onKeyframesDelete === undefined
      ? []
      : [
          {
            id: 'delete-keyframes',
            label: count > 1 ? `키프레임 ${count}개 삭제` : '키프레임 삭제',
            onSelect: deleteKeyframes,
            shortcut: 'Backspace',
            tone: 'danger',
            type: 'action',
          },
        ]
  }
  const getPointerTime = (event: MouseEvent & {currentTarget: HTMLDivElement}) => {
    const source = options.source()
    return source.getTime(event.clientX, event.currentTarget.getBoundingClientRect())
  }
  const handleClick = (event: MouseEvent & {currentTarget: HTMLDivElement}) => {
    event.currentTarget.focus({preventScroll: true})
    const source = options.source()
    source.onSeek?.(getPointerTime(event), source.track.parameter.id)
  }
  const handleDoubleClick = (event: MouseEvent & {currentTarget: HTMLDivElement}) => {
    if (event.target instanceof Element && event.target.closest('button') !== null) {
      return
    }
    event.currentTarget.focus({preventScroll: true})
    addKeyframe(getPointerTime(event))
  }
  const handleContextMenu = (event: MouseEvent & {currentTarget: HTMLDivElement}) => {
    if (!(event.target instanceof Element) || event.target.closest('button') === null) {
      prepareContextMenu(getPointerTime(event))
    }
  }
  const handleKeyDown = (event: KeyboardEvent & {currentTarget: HTMLDivElement}) => {
    if (event.key === 'ContextMenu' || (event.key === 'F10' && event.shiftKey)) {
      requestKeyboardContextMenu(options.source(), event)
      return
    }
    if (
      (event.key !== 'Backspace' && event.key !== 'Delete') ||
      event.defaultPrevented ||
      event.repeat ||
      event.isComposing ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      selectedTimes().length === 0
    ) {
      return
    }
    if (
      event.target instanceof Element &&
      event.target.closest('input, textarea, select, [contenteditable]') !== null
    ) {
      return
    }
    if (options.source().onKeyframesDelete === undefined) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    if (deleteKeyframes()) {
      event.currentTarget.focus({preventScroll: true})
    }
  }
  const handleMenuOpenChange = (open: boolean) => {
    if (open) {
      setInteractedOutside(false)
    } else {
      setRequestedTime(null)
    }
  }
  return {
    contextEntries,
    handleClick,
    handleContextMenu,
    handleDoubleClick,
    handleInteractOutside: () => setInteractedOutside(true),
    handleKeyDown,
    handleMenuOpenChange,
    prepareContextMenu,
    restoreFocus: () => !interactedOutside(),
  }
}
