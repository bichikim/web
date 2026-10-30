import {createSignal} from 'solid-js'
import characterExpressions from '../../data/character-expressions.json'
import type {WidgetBackground} from './backgrounds'

export * from './backgrounds'
export * from './use-widget-interaction'

type PreviewPhase = 'poster' | 'loading' | 'ready' | 'error'
const DEFAULT_SIZE = 100
interface WidgetPoint {
  readonly x: number
  readonly y: number
}
interface CharacterExpressionGroup {
  readonly name: string
  readonly expressions: ReadonlyArray<string>
}
const expressionGroups: ReadonlyArray<CharacterExpressionGroup> = characterExpressions.groups
const constrain = (point: WidgetPoint, button: HTMLButtonElement): WidgetPoint => {
  const parent = button.parentElement
  if (parent === null) {
    return {x: 0, y: 0}
  }
  const CENTER_INSET = 24
  const horizontal = Math.max(0, parent.clientWidth / 2 - CENTER_INSET)
  const vertical = Math.max(0, parent.clientHeight / 2 - CENTER_INSET)
  return {
    x: Math.max(-horizontal, Math.min(horizontal, point.x)),
    y: Math.max(-vertical, Math.min(vertical, point.y)),
  }
}

export const useWidgetPreview = () => {
  const BASE_SCALE = 1.4
  const [background, setBackground] = createSignal<WidgetBackground>('profile')
  const [motionId, setMotionId] = createSignal('Idle:0')
  const [expressionId, setExpressionId] = createSignal<string | null>(null)
  const [playing, setPlaying] = createSignal(true)
  const [tracking, setTracking] = createSignal(true)
  const [phase, setPhase] = createSignal<PreviewPhase>('poster')
  const [size, setSize] = createSignal(DEFAULT_SIZE)
  const [position, setPosition] = createSignal({x: 0, y: 0})
  const [drag, setDrag] = createSignal<WidgetPoint | null>(null)
  const activate = () => {
    const current = phase()
    switch (current) {
      case 'poster':
      case 'error':
        return setPhase('loading')
      case 'ready':
        return setPlaying((value) => !value)
      case 'loading':
        return undefined
      default: {
        const exhaustive: never = current
        return exhaustive
      }
    }
  }
  const press = (event: PointerEvent & {currentTarget: HTMLButtonElement}) => {
    if (event.button !== 0) {
      return
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    const current = position()
    setDrag({x: event.clientX - current.x, y: event.clientY - current.y})
  }
  const move = (event: PointerEvent & {currentTarget: HTMLButtonElement}) => {
    const origin = drag()
    if (origin !== null) {
      setPosition(
        constrain({x: event.clientX - origin.x, y: event.clientY - origin.y}, event.currentTarget),
      )
    }
  }
  const resetPosition = () => setPosition({x: 0, y: 0})
  const toggleWalking = () => {
    setMotionId((current) => (current === 'Walk:0' ? 'Idle:0' : 'Walk:0'))
    setPlaying(true)
    const current = phase()
    if (current === 'poster' || current === 'error') {
      setPhase('loading')
    }
  }
  const keyboard = (event: KeyboardEvent & {currentTarget: HTMLButtonElement}) => {
    if (event.key === 'Home') {
      event.preventDefault()
      resetPosition()
    }
  }
  const actionLabel = () => {
    switch (phase()) {
      case 'poster':
      case 'loading':
        return null
      case 'error':
        return '다시 불러오기'
      case 'ready':
        return playing() ? '일시 정지' : '재생'
    }
  }
  return {
    actionLabel,
    activate,
    background,
    dragging: () => drag() !== null,
    expressionGroups,
    expressionId,
    fail: () => setPhase('error'),
    finish: () => setPhase('ready'),
    fitPosition: (button: HTMLButtonElement) =>
      setPosition((current) => {
        const next = constrain(current, button)
        return current.x === next.x && current.y === next.y ? current : next
      }),
    keyboard,
    motionId,
    mounted: () => phase() === 'loading' || phase() === 'ready',
    move,
    phase,
    playing,
    position,
    press,
    release: () => setDrag(null),
    resetPosition,
    resize: (event: InputEvent & {currentTarget: HTMLInputElement}) =>
      setSize(Number(event.currentTarget.value)),
    scale: () => (size() / DEFAULT_SIZE) * BASE_SCALE,
    selectBackground: (value: WidgetBackground) => setBackground(value),
    selectExpression: (value: string | null) => setExpressionId(value),
    size,
    toggleTracking: () => setTracking((value) => !value),
    toggleWalking,
    tracking,
    walking: () => motionId() === 'Walk:0',
  }
}
