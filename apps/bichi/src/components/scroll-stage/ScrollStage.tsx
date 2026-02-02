import {onCleanup, onMount} from 'solid-js'
import {Portal} from 'solid-js/web'
import {
  applyScrollDomTransforms,
  getCenteredSectionTitle,
  getScrollStageElements,
  initializeLineElement,
} from './scroll-stage-dom'
import {createScrollState, type Viewport} from './scroll-stage-scroll'
import {createWebglStage} from './scroll-stage-webgl'
import {EASE, ROTATION_SPEED} from './scroll-stage-settings'
import {createUniformAnimator} from './scroll-stage-uniforms'

export interface ScrollStageProps {
  /** Ref to the .content element that contains .scroll__content and .layout__line */
  contentRef: () => HTMLElement | undefined
}

export function ScrollStage(props: ScrollStageProps) {
  let canvasRef: HTMLCanvasElement | undefined

  const setCanvasRef = (element: HTMLCanvasElement) => {
    canvasRef = element
  }

  onMount(() => {
    const contentElement = props.contentRef()
    const canvasElement = canvasRef

    if (!contentElement || !canvasElement) {
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

    let canceled = false
    let cleanup: (() => void) | undefined

    const setupStage = async () => {
      const stage = await createWebglStage(viewport, {canvas: canvasElement})

      if (canceled) {
        stage.dispose()

        return
      }

      const uniformAnimator = createUniformAnimator(stage.material, EASE)
      let rafId: number

      const updateScrollValues = () => {
        scrollState.updatePosition(window.scrollY)
        const {metrics} = scrollState.state

        applyScrollDomTransforms(elements, metrics.soft, metrics.normalized)
        stage.mesh.rotation.x = metrics.normalized * Math.PI
        stage.setScrollNormalized(metrics.normalized)
        uniformAnimator.update(metrics.normalized)
        stage.setText(getCenteredSectionTitle(elements.scrollContentElement))
      }

      const update = () => {
        const elapsed = stage.clock.getElapsedTime()

        stage.mesh.rotation.y = elapsed * ROTATION_SPEED
        ;(stage.material.uniforms as Record<string, {value: number}>).uTime.value = elapsed
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

      cleanup = () => {
        cancelAnimationFrame(rafId)
        window.removeEventListener('scroll', onScroll)
        window.removeEventListener('resize', onResize)
        stage.dispose()
      }
    }

    setupStage().catch((error) => {
      console.warn('[ScrollStage] Failed to load WebGL stage', error)
    })

    onCleanup(() => {
      canceled = true
      cleanup?.()
    })
  })

  return (
    <Portal mount={document.body}>
      <canvas ref={setCanvasRef} />
    </Portal>
  )
}
