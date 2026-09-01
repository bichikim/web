import {clamp} from 'es-toolkit/math'
import {batch, createEffect, createSignal, onCleanup, onMount} from 'solid-js'

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
    storedPreference = window.localStorage.getItem(PANEL_PREFERENCE_KEY)
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
    window.localStorage.setItem(PANEL_PREFERENCE_KEY, JSON.stringify(preference))
  } catch (error) {
    console.warn('Puppet editor panel preference could not be saved.', error)
  }
}

const getPointerPosition = (event: PointerEvent, position: EditorPanelPosition) =>
  position === 'bottom' ? event.clientY : event.clientX

const getResizeDirection = (position: EditorPanelPosition) => (position === 'left' ? 1 : -1)

export const usePanelLayout = () => {
  const [bottomOpen, setBottomOpen] = createSignal(true)
  const [bottomSize, setBottomSize] = createSignal<number>(EDITOR_PANEL_SPECS.bottom.defaultSize)
  const [leftOpen, setLeftOpen] = createSignal(true)
  const [leftSize, setLeftSize] = createSignal<number>(EDITOR_PANEL_SPECS.left.defaultSize)
  const [resizingPosition, setResizingPosition] = createSignal<EditorPanelPosition | null>(null)
  const [rightOpen, setRightOpen] = createSignal(true)
  const [rightSize, setRightSize] = createSignal<number>(EDITOR_PANEL_SPECS.right.defaultSize)
  let stopResize: (() => void) | undefined

  const getSize = (position: EditorPanelPosition) => {
    switch (position) {
      case 'bottom':
        return bottomSize()
      case 'left':
        return leftSize()
      case 'right':
        return rightSize()
      default: {
        const exhaustivePosition: never = position
        return exhaustivePosition
      }
    }
  }

  const setOpen = (position: EditorPanelPosition, open: boolean) => {
    switch (position) {
      case 'bottom':
        setBottomOpen(open)
        return
      case 'left':
        setLeftOpen(open)
        return
      case 'right':
        setRightOpen(open)
        return
      default: {
        const exhaustivePosition: never = position
        return exhaustivePosition
      }
    }
  }

  const setSize = (position: EditorPanelPosition, size: number) => {
    switch (position) {
      case 'bottom':
        setBottomSize(size)
        return
      case 'left':
        setLeftSize(size)
        return
      case 'right':
        setRightSize(size)
        return
      default: {
        const exhaustivePosition: never = position
        return exhaustivePosition
      }
    }
  }

  const resize = (position: EditorPanelPosition, size: number) => {
    const specification = EDITOR_PANEL_SPECS[position]
    setSize(position, clamp(size, specification.minimumSize, specification.maximumSize))
  }

  const resizeBy = (position: EditorPanelPosition, delta: number) => {
    resize(position, getSize(position) + delta)
  }

  onMount(() => {
    const preference = readPanelPreference()

    if (preference !== undefined) {
      batch(() => {
        setBottomOpen(preference.bottom.open)
        resize('bottom', preference.bottom.size)
        setLeftOpen(preference.left.open)
        resize('left', preference.left.size)
        setRightOpen(preference.right.open)
        resize('right', preference.right.size)
      })
    }

    createEffect(() => {
      writePanelPreference({
        bottom: {open: bottomOpen(), size: bottomSize()},
        left: {open: leftOpen(), size: leftSize()},
        right: {open: rightOpen(), size: rightSize()},
      })
    })
  })

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
    let collapseOnRelease = false
    const handlePointerMove = (moveEvent: PointerEvent) => {
      const pointerDelta = getPointerPosition(moveEvent, position) - initialPointerPosition
      const nextSize = initialSize + pointerDelta * direction
      collapseOnRelease = nextSize <= specification.minimumSize
      resize(position, nextSize)
    }
    const handlePointerUp = () => {
      if (collapseOnRelease) {
        setOpen(position, false)
      }

      stopResize?.()
    }
    const handlePointerCancel = () => stopResize?.()

    stopResize = () => {
      window.removeEventListener('pointercancel', handlePointerCancel)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      setResizingPosition(null)
      stopResize = undefined
    }
    window.addEventListener('pointercancel', handlePointerCancel)
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
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
    setRightOpen,
    startResize,
  }
}
