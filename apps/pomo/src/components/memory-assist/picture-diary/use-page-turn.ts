import {type Accessor, batch, createSignal, type JSX, onCleanup, type Setter} from 'solid-js'

import {
  clampFoldTarget,
  computePageFold,
  type FoldPoint,
  type PageFold,
  shouldCompletePageFold,
} from './fold'

export type PictureDiaryTurnDirection = 'newer' | 'older'
export type PictureDiaryTurnKind = 'cover' | 'entry'
export type PictureDiaryTurnPhase = 'grab' | 'move' | 'settle'

export interface PictureDiaryTurnIntent {
  readonly direction: PictureDiaryTurnDirection
  readonly kind: PictureDiaryTurnKind
}

export interface PictureDiaryTurnView extends PictureDiaryTurnIntent {
  readonly compact: boolean
  readonly fold: PageFold | null
  readonly pageHeight: number
  readonly pageWidth: number
  readonly phase: PictureDiaryTurnPhase
}

interface PageTurnGesture {
  readonly compact: boolean
  readonly anchor: FoldPoint
  readonly intent: PictureDiaryTurnIntent
  readonly pageHeight: number
  readonly pageWidth: number
  readonly pointerId: number
  readonly pointerType: string
  readonly startClientX: number
  readonly startClientY: number
  readonly startPoint: FoldPoint
  readonly startTime: number
}

interface PointerSample {
  readonly time: number
  readonly x: number
}

interface PageMetrics {
  readonly compact: boolean
  readonly height: number
  readonly left: number
  readonly pageWidth: number
  readonly top: number
}

interface PageTurnAnimation {
  readonly completed: boolean
  readonly currentGesture: PageTurnGesture
  readonly destination: FoldPoint
  readonly from: FoldPoint
  readonly getTargetY?: (progress: number, height: number) => number
}

interface UsePictureDiaryPageTurnOptions {
  readonly disabled: Accessor<boolean>
  readonly onComplete: (intent: PictureDiaryTurnIntent) => void
  readonly resolveIntent: (direction: PictureDiaryTurnDirection) => PictureDiaryTurnIntent | null
  readonly surface: Accessor<HTMLDivElement | undefined>
}

export interface PictureDiaryPageTurnController {
  readonly handlePointerDown: JSX.EventHandler<HTMLDivElement, PointerEvent>
  readonly startTurn: (direction: PictureDiaryTurnDirection) => void
  readonly view: Accessor<PictureDiaryTurnView | null>
}

const PAGE_TURN_DURATION = 600
const POINTER_INTENT_DISTANCE = 8
const SWIPE_DISTANCE = 30
const SWIPE_TIME = 250
const VELOCITY_WINDOW = 60
const CUBIC_POWER = 3
const HALF = 0.5

const easeOutCubic = (progress: number) => 1 - (1 - progress) ** CUBIC_POWER
const getProgrammaticTargetY = (progress: number, height: number) =>
  height - Math.sin(progress * Math.PI) * height * HALF

class PictureDiaryPageTurnMachine {
  private animationFrame: number | undefined
  private gesture: PageTurnGesture | undefined
  private gestureAxis: 'horizontal' | 'pending' | 'vertical' = 'pending'
  private lastTarget: FoldPoint | undefined
  private pointerListenersAttached = false
  private pointerSamples: Array<PointerSample> = []

  constructor(
    private readonly options: UsePictureDiaryPageTurnOptions,
    private readonly view: Accessor<PictureDiaryTurnView | null>,
    private readonly setView: Setter<PictureDiaryTurnView | null>,
  ) {}

  readonly handlePointerDown: JSX.EventHandler<HTMLDivElement, PointerEvent> = (event) => {
    const direction = event.currentTarget.dataset.pictureDiaryEdge
    if (
      this.options.disabled() ||
      this.view() !== null ||
      event.button !== 0 ||
      (direction !== 'newer' && direction !== 'older')
    ) {
      return
    }

    const intent = this.options.resolveIntent(direction)
    const metrics = this.getMetrics()
    if (intent === null || metrics === null) {
      return
    }

    this.stopAnimation()
    const startPoint = this.getLocalPoint(event.clientX, event.clientY, direction, metrics)
    const anchor = {
      x: direction === 'older' ? -metrics.pageWidth : metrics.pageWidth,
      y: startPoint.y,
    }
    const now = performance.now()
    this.gesture = {
      anchor,
      compact: metrics.compact,
      intent,
      pageHeight: metrics.height,
      pageWidth: metrics.pageWidth,
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPoint,
      startTime: now,
    }
    this.gestureAxis = 'pending'
    this.lastTarget = undefined
    this.pointerSamples = [{time: now, x: startPoint.x}]
    this.setView({
      ...intent,
      compact: metrics.compact,
      fold: null,
      pageHeight: metrics.height,
      pageWidth: metrics.pageWidth,
      phase: 'grab',
    })
    this.attachPointerListeners()
  }

  readonly startTurn = (direction: PictureDiaryTurnDirection) => {
    if (this.options.disabled() || this.view() !== null) {
      return
    }

    const intent = this.options.resolveIntent(direction)
    const metrics = this.getMetrics()
    if (intent === null || metrics === null) {
      return
    }

    const anchor = {
      x: direction === 'older' ? -metrics.pageWidth : metrics.pageWidth,
      y: metrics.height,
    }
    const currentGesture: PageTurnGesture = {
      anchor,
      compact: metrics.compact,
      intent,
      pageHeight: metrics.height,
      pageWidth: metrics.pageWidth,
      pointerId: -1,
      pointerType: 'programmatic',
      startClientX: 0,
      startClientY: 0,
      startPoint: anchor,
      startTime: performance.now(),
    }
    this.gesture = currentGesture
    this.animateTo({
      completed: true,
      currentGesture,
      destination: {x: -anchor.x, y: anchor.y},
      from: anchor,
      getTargetY: getProgrammaticTargetY,
    })
  }

  destroy() {
    this.stopAnimation()
    this.detachPointerListeners()
  }

  private readonly handlePointerMove = (event: PointerEvent) => {
    const currentGesture = this.gesture
    if (currentGesture === undefined || currentGesture.pointerId !== event.pointerId) {
      return
    }

    const horizontalDistance = event.clientX - currentGesture.startClientX
    const verticalDistance = event.clientY - currentGesture.startClientY
    if (!this.resolveGestureAxis(currentGesture, horizontalDistance, verticalDistance)) {
      return
    }

    event.preventDefault()
    const metrics = this.getGestureMetrics(currentGesture)
    if (metrics === null) {
      this.resetGesture()
      return
    }

    const target = this.getLocalPoint(
      event.clientX,
      event.clientY,
      currentGesture.intent.direction,
      metrics,
    )
    this.recordPointerSample(target.x, performance.now())
    this.setFoldView(currentGesture, target, 'move')
  }

  private readonly handlePointerUp = (event: PointerEvent) => {
    const currentGesture = this.gesture
    if (currentGesture === undefined || currentGesture.pointerId !== event.pointerId) {
      return
    }

    this.detachPointerListeners()
    const activeView = this.view()
    const target = this.lastTarget
    const horizontalDistance = event.clientX - currentGesture.startClientX
    if (this.gestureAxis !== 'horizontal' || target === undefined || activeView?.fold === null) {
      this.resetGesture()
      return
    }

    this.recordPointerSample(target.x, performance.now())
    const completed = shouldCompletePageFold({
      anchorX: currentGesture.anchor.x,
      progress: activeView?.fold?.progress ?? 0,
      swiping:
        Math.abs(horizontalDistance) >= SWIPE_DISTANCE &&
        performance.now() - currentGesture.startTime <= SWIPE_TIME,
      velocityX: this.getReleaseVelocity(),
    })
    this.animateTo({
      completed,
      currentGesture,
      destination: {
        x: completed ? -currentGesture.anchor.x : currentGesture.anchor.x,
        y: currentGesture.anchor.y,
      },
      from: target,
    })
  }

  private readonly handlePointerCancel = (event: PointerEvent) => {
    const currentGesture = this.gesture
    if (currentGesture === undefined || currentGesture.pointerId !== event.pointerId) {
      return
    }

    this.detachPointerListeners()
    if (this.lastTarget === undefined) {
      this.resetGesture()
      return
    }

    this.animateTo({
      completed: false,
      currentGesture,
      destination: currentGesture.anchor,
      from: this.lastTarget,
    })
  }

  private resolveGestureAxis(
    currentGesture: PageTurnGesture,
    horizontalDistance: number,
    verticalDistance: number,
  ) {
    if (this.gestureAxis === 'pending') {
      if (
        Math.max(Math.abs(horizontalDistance), Math.abs(verticalDistance)) < POINTER_INTENT_DISTANCE
      ) {
        return false
      }

      this.gestureAxis =
        Math.abs(horizontalDistance) > Math.abs(verticalDistance) ? 'horizontal' : 'vertical'
      if (this.gestureAxis === 'vertical' && currentGesture.pointerType === 'touch') {
        this.resetGesture()
        return false
      }
    }

    return this.gestureAxis === 'horizontal'
  }

  private getMetrics(): PageMetrics | null {
    const bounds = this.options.surface()?.getBoundingClientRect()
    if (bounds === undefined || bounds.width <= 0 || bounds.height <= 0) {
      return null
    }

    const compact =
      typeof window.matchMedia === 'function' && window.matchMedia('(width < 48rem)').matches
    return {
      compact,
      height: bounds.height,
      left: bounds.left,
      pageWidth: compact ? bounds.width : bounds.width / 2,
      top: bounds.top,
    }
  }

  private getLocalPoint(
    clientX: number,
    clientY: number,
    direction: PictureDiaryTurnDirection,
    metrics: PageMetrics,
  ): FoldPoint {
    return {
      x:
        clientX - metrics.left - (metrics.compact && direction === 'newer' ? 0 : metrics.pageWidth),
      y: Math.max(0, Math.min(metrics.height, clientY - metrics.top)),
    }
  }

  private getGestureMetrics(gesture: PageTurnGesture): PageMetrics | null {
    const metrics = this.getMetrics()
    if (
      metrics === null ||
      metrics.compact !== gesture.compact ||
      metrics.height !== gesture.pageHeight ||
      metrics.pageWidth !== gesture.pageWidth
    ) {
      return null
    }
    return metrics
  }

  private setFoldView(
    currentGesture: PageTurnGesture,
    target: FoldPoint,
    phase: PictureDiaryTurnPhase,
  ) {
    const inwardTarget = {
      x:
        currentGesture.anchor.x > 0
          ? Math.min(currentGesture.anchor.x, target.x)
          : Math.max(currentGesture.anchor.x, target.x),
      y: target.y,
    }
    const constrainedTarget = clampFoldTarget({
      anchor: currentGesture.anchor,
      height: currentGesture.pageHeight,
      target: inwardTarget,
    })
    this.lastTarget = constrainedTarget
    this.setView({
      ...currentGesture.intent,
      compact: currentGesture.compact,
      fold: computePageFold({
        anchor: currentGesture.anchor,
        height: currentGesture.pageHeight,
        target: constrainedTarget,
        width: currentGesture.pageWidth,
      }),
      pageHeight: currentGesture.pageHeight,
      pageWidth: currentGesture.pageWidth,
      phase,
    })
  }

  private animateTo(animation: PageTurnAnimation) {
    this.stopAnimation()
    if (this.getGestureMetrics(animation.currentGesture) === null) {
      this.resetGesture()
      return
    }
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      this.finishAnimation(animation.currentGesture, animation.completed)
      return
    }
    let startTime: number | undefined
    this.setFoldView(animation.currentGesture, animation.from, 'settle')

    const step = (time: number) => {
      if (this.getGestureMetrics(animation.currentGesture) === null) {
        this.resetGesture()
        return
      }
      startTime ??= time
      const linearProgress = Math.min(1, (time - startTime) / PAGE_TURN_DURATION)
      const progress = easeOutCubic(linearProgress)
      this.setFoldView(
        animation.currentGesture,
        {
          x: animation.from.x + (animation.destination.x - animation.from.x) * progress,
          y:
            animation.getTargetY?.(progress, animation.currentGesture.pageHeight) ??
            animation.from.y + (animation.destination.y - animation.from.y) * progress,
        },
        'settle',
      )

      if (linearProgress < 1) {
        this.animationFrame = requestAnimationFrame(step)
      } else {
        this.finishAnimation(animation.currentGesture, animation.completed)
      }
    }

    this.animationFrame = requestAnimationFrame(step)
  }

  private finishAnimation(currentGesture: PageTurnGesture, completed: boolean) {
    this.animationFrame = undefined
    this.gesture = undefined
    this.lastTarget = undefined
    this.pointerSamples = []
    batch(() => {
      if (completed) {
        this.options.onComplete(currentGesture.intent)
      }
      this.setView(null)
    })
  }

  private stopAnimation() {
    if (this.animationFrame !== undefined) {
      cancelAnimationFrame(this.animationFrame)
      this.animationFrame = undefined
    }
  }

  private attachPointerListeners() {
    window.addEventListener('pointermove', this.handlePointerMove, {passive: false})
    window.addEventListener('pointerup', this.handlePointerUp)
    window.addEventListener('pointercancel', this.handlePointerCancel)
    this.pointerListenersAttached = true
  }

  private detachPointerListeners() {
    if (!this.pointerListenersAttached) {
      return
    }

    window.removeEventListener('pointermove', this.handlePointerMove)
    window.removeEventListener('pointerup', this.handlePointerUp)
    window.removeEventListener('pointercancel', this.handlePointerCancel)
    this.pointerListenersAttached = false
  }

  private resetGesture() {
    this.stopAnimation()
    this.detachPointerListeners()
    this.gesture = undefined
    this.gestureAxis = 'pending'
    this.lastTarget = undefined
    this.pointerSamples = []
    this.setView(null)
  }

  private recordPointerSample(x: number, time: number) {
    this.pointerSamples.push({time, x})
    const cutoff = time - VELOCITY_WINDOW
    this.pointerSamples = this.pointerSamples.filter(
      (sample, index) => sample.time >= cutoff || index >= this.pointerSamples.length - 2,
    )
  }

  private getReleaseVelocity() {
    const [firstSample] = this.pointerSamples
    const finalSample = this.pointerSamples.at(-1)
    return firstSample === undefined || finalSample === undefined
      ? 0
      : (finalSample.x - firstSample.x) / Math.max(1, finalSample.time - firstSample.time)
  }
}

export const usePictureDiaryPageTurn = (
  options: UsePictureDiaryPageTurnOptions,
): PictureDiaryPageTurnController => {
  const [view, setView] = createSignal<PictureDiaryTurnView | null>(null)
  const machine = new PictureDiaryPageTurnMachine(options, view, setView)

  onCleanup(() => machine.destroy())

  return {
    handlePointerDown: machine.handlePointerDown,
    startTurn: machine.startTurn,
    view,
  }
}
