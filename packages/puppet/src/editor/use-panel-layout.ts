import {clamp} from 'es-toolkit/math'
import {createEffect, createSignal, onCleanup} from 'solid-js'

export const EDITOR_PANEL_SPECS = {
  bottom: {defaultSize: 260, maximumSize: 420, minimumSize: 180},
  left: {defaultSize: 300, maximumSize: 420, minimumSize: 220},
  right: {defaultSize: 260, maximumSize: 360, minimumSize: 220},
} as const

export type EditorPanelPosition = keyof typeof EDITOR_PANEL_SPECS

interface EditorPanelPreference {
  readonly bottom: PanelPreference
  readonly left: PanelPreference
  readonly right: PanelPreference
}

interface PanelPreference {
  readonly open: boolean
  readonly size: number
}

const COLLAPSE_RATIO = 0.5

const PANEL_PREFERENCE_KEY = 'puppet:editor-panel-layout:v1'

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null

const isPanelPreference = (value: unknown): value is PanelPreference =>
  isRecord(value) &&
  typeof value.open === 'boolean' &&
  typeof value.size === 'number' &&
  Number.isFinite(value.size)

const isEditorPreference = (value: unknown): value is EditorPanelPreference =>
  isRecord(value) &&
  isPanelPreference(value.bottom) &&
  isPanelPreference(value.left) &&
  isPanelPreference(value.right)

const readPanelPreference = () => {
  let storedPreference: string | null

  try {
    storedPreference = globalThis.localStorage.getItem(PANEL_PREFERENCE_KEY)
  } catch (error) {
    console.warn('Puppet editor panel preference could not be read.', error)
    return undefined
  }

  if (storedPreference === null) {
    return undefined
  }

  try {
    const preference: unknown = JSON.parse(storedPreference)
    return isEditorPreference(preference) ? preference : undefined
  } catch {
    return undefined
  }
}

const writePanelPreference = (preference: EditorPanelPreference) => {
  try {
    globalThis.localStorage.setItem(PANEL_PREFERENCE_KEY, JSON.stringify(preference))
  } catch (error) {
    console.warn('Puppet editor panel preference could not be saved.', error)
  }
}

const getPointerPosition = (event: PointerEvent, position: EditorPanelPosition) =>
  position === 'bottom' ? event.clientY : event.clientX

const getResizeDirection = (position: EditorPanelPosition) => (position === 'left' ? 1 : -1)

export const usePanelLayout = () => {
  const preference = readPanelPreference()
  const initialSize = (position: EditorPanelPosition) => {
    const spec = EDITOR_PANEL_SPECS[position]
    return clamp(
      preference?.[position].size ?? spec.defaultSize,
      spec.minimumSize,
      spec.maximumSize,
    )
  }
  const [bottomOpen, setBottomOpen] = createSignal(preference?.bottom.open ?? true)
  const [bottomSize, setBottomSize] = createSignal(initialSize('bottom'))
  const [leftOpen, setLeftOpen] = createSignal(preference?.left.open ?? true)
  const [leftSize, setLeftSize] = createSignal(initialSize('left'))
  const [resizingPosition, setResizingPosition] = createSignal<EditorPanelPosition | null>(null)
  const [rightOpen, setRightOpen] = createSignal(preference?.right.open ?? true)
  const [rightSize, setRightSize] = createSignal(initialSize('right'))
  let stopResize: (() => void) | undefined

  const sizes = {bottom: bottomSize, left: leftSize, right: rightSize}
  const openSetters = {bottom: setBottomOpen, left: setLeftOpen, right: setRightOpen}
  const sizeSetters = {bottom: setBottomSize, left: setLeftSize, right: setRightSize}
  const getSize = (position: EditorPanelPosition) => sizes[position]()
  const setOpen = (position: EditorPanelPosition, open: boolean) => openSetters[position](open)
  const setSize = (position: EditorPanelPosition, size: number) => sizeSetters[position](size)

  const resize = (position: EditorPanelPosition, size: number) => {
    const specification = EDITOR_PANEL_SPECS[position]
    setSize(position, clamp(size, specification.minimumSize, specification.maximumSize))
  }

  const resizeBy = (position: EditorPanelPosition, delta: number) => {
    resize(position, getSize(position) + delta)
  }

  createEffect(
    () => ({
      bottom: {open: bottomOpen(), size: bottomSize()},
      left: {open: leftOpen(), size: leftSize()},
      right: {open: rightOpen(), size: rightSize()},
    }),
    writePanelPreference,
  )

  const startResize = (position: EditorPanelPosition, event: PointerEvent) => {
    if (event.button !== 0) {
      return
    }

    event.preventDefault()
    stopResize?.()
    setResizingPosition(position)
    const initialPointerPosition = getPointerPosition(event, position)
    const initialSize = getSize(position)
    const direction = getResizeDirection(position)
    const specification = EDITOR_PANEL_SPECS[position]
    const {pointerId} = event
    let collapseOnRelease = false
    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) {
        return
      }
      const pointerDelta = getPointerPosition(moveEvent, position) - initialPointerPosition
      const nextSize = initialSize + pointerDelta * direction
      collapseOnRelease = nextSize <= specification.minimumSize * COLLAPSE_RATIO
      resize(position, nextSize)
    }
    const handlePointerUp = (upEvent: PointerEvent) => {
      if (upEvent.pointerId !== pointerId) {
        return
      }
      if (collapseOnRelease) {
        setOpen(position, false)
      }

      stopResize?.()
    }
    const cancel = () => stopResize?.()
    const handlePointerCancel = (cancelEvent: PointerEvent) => {
      if (cancelEvent.pointerId === pointerId) {
        cancel()
      }
    }

    stopResize = () => {
      globalThis.removeEventListener('pointercancel', handlePointerCancel)
      globalThis.removeEventListener('pointermove', handlePointerMove)
      globalThis.removeEventListener('pointerup', handlePointerUp)
      globalThis.removeEventListener('blur', cancel)
      setResizingPosition(null)
      stopResize = undefined
    }
    globalThis.addEventListener('pointercancel', handlePointerCancel)
    globalThis.addEventListener('pointermove', handlePointerMove)
    globalThis.addEventListener('pointerup', handlePointerUp)
    globalThis.addEventListener('blur', cancel)
  }

  onCleanup(() => stopResize?.())

  return {
    bottomOpen,
    bottomSize,
    leftOpen,
    leftSize,
    resizeBy,
    resizingPosition,
    rightOpen,
    rightSize,
    setBottomOpen,
    setLeftOpen,
    setOpen,
    setRightOpen,
    startResize,
  }
}
