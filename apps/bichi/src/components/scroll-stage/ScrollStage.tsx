import {onCleanup, onMount} from 'solid-js'
import {
  applyScrollDomTransforms,
  attachCanvasToBody,
  getScrollStageElements,
  initializeLineElement,
  removeCanvasFromBody,
} from './scroll-stage-dom'
import {createScrollState, type Viewport} from './scroll-stage-scroll'
import {createUniformAnimator} from './scroll-stage-uniforms'
import {createWebglStage} from './scroll-stage-webgl'
import {EASE, ROTATION_SPEED} from './scroll-stage-settings'

export interface ScrollStageProps {
  /** Ref to the .content element that contains .scroll__content and .layout__line */
  contentRef: () => HTMLElement | undefined
}

export function ScrollStage(props: ScrollStageProps) {
  onMount(() => {
    const contentElement = props.contentRef()

    if (!contentElement) {
      return
    }

    const elements = getScrollStageElements(contentElement)

    if (!elements) {
      return
    }

    initializeLineElement(elements.lineElement)

    let viewport: Viewport = {height: window.innerHeight, width: window.innerWidth}
    const scrollState = createScrollState(elements.scrollContentElement, {ease: EASE})

    scrollState.setViewport(viewport)

    const stage = createWebglStage(viewport)

    attachCanvasToBody(stage.canvas)

    const uniformAnimator = createUniformAnimator(stage.material, EASE)
    let rafId: number

    const updateScrollValues = () => {
      scrollState.updatePosition(window.scrollY)
      const {metrics} = scrollState.state

      applyScrollDomTransforms(elements, metrics.soft, metrics.normalized)
      stage.mesh.rotation.x = metrics.normalized * Math.PI
      uniformAnimator.update(metrics.normalized)
    }

    const update = () => {
      const elapsed = stage.clock.getElapsedTime()

      stage.mesh.rotation.y = elapsed * ROTATION_SPEED
      updateScrollValues()
      stage.render()
      rafId = requestAnimationFrame(update)
    }

    const onResize = () => {
      viewport = {height: window.innerHeight, width: window.innerWidth}
      scrollState.setViewport(viewport)
      scrollState.updateSizes()
      stage.updateScale(viewport)
      stage.resize(viewport)
    }

    const {onScroll} = scrollState

    scrollState.updateSizes()
    onResize()
    window.addEventListener('scroll', onScroll)
    window.addEventListener('resize', onResize)
    rafId = requestAnimationFrame(update)

    onCleanup(() => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      stage.dispose()
      removeCanvasFromBody(stage.canvas)
    })
  })

  return null
}
