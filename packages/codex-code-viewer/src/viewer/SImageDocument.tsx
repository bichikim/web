import {createEffect, createSignal, type JSX, onCleanup, untrack} from 'solid-js'
import {useFileViewState} from './view-state/context'
import {SImageToolbar} from './SImageToolbar'
import {useImageGestures} from './use-image-gestures'
import {useImageView} from './use-image-view'

const viewportClasses = [
  'relative min-h-0 min-w-0 flex-1 touch-none select-none overflow-hidden overscroll-contain',
  'outline-none data-[pannable=true]:cursor-grab data-[dragging=true]:cursor-grabbing',
].join(' ')

const imageClasses = [
  'pointer-events-none absolute left-0 top-0 block max-w-none select-none',
  '[height:var(--image-height)] [width:var(--image-width)]',
  '[transform:translate(var(--image-x),var(--image-y))]',
].join(' ')

interface SImageDocumentProps {
  src: string
  path: string
  onError?: () => void
}
export const SImageDocument = (props: SImageDocumentProps) => {
  const state = useFileViewState()
  const saved = state?.read()?.image
  const [element, setElement] = createSignal<HTMLDivElement | null>(null)
  const [natural, setNatural] = createSignal({height: 0, width: 0})
  const [viewport, setViewport] = createSignal({height: 0, width: 0})
  const image = useImageView({natural, viewport})
  createEffect(() => {
    if (image.loaded()) {
      state?.update({image: image.camera()})
    }
  })
  createEffect(() => {
    props.src
    untrack(() => {
      setNatural({height: 0, width: 0})
      image.restore(saved ?? {mode: 'fit'})
    })
  })
  createEffect(() => {
    const target = element()
    if (target === null) {
      return
    }
    setViewport({height: target.clientHeight, width: target.clientWidth})
    if (typeof ResizeObserver === 'undefined') {
      return
    }
    const observer = new ResizeObserver((entries) => {
      const rectangle = entries[0]?.contentRect
      if (rectangle !== undefined) {
        setViewport({height: rectangle.height, width: rectangle.width})
      }
    })
    observer.observe(target)
    onCleanup(() => observer.disconnect())
  })
  const handleLoad: JSX.EventHandler<HTMLImageElement, Event> = (event) => {
    setNatural({height: event.currentTarget.naturalHeight, width: event.currentTarget.naturalWidth})
  }
  const gestures = useImageGestures({element, image})
  return (
    <div class="min-h-0 flex flex-1 flex-col overflow-hidden">
      <SImageToolbar image={image} onZoomIn={gestures.zoomIn} onZoomOut={gestures.zoomOut} />
      <div class="min-h-0 flex flex-1 overflow-hidden p-4">
        <div
          aria-label="이미지 확대 및 이동"
          aria-description="핀치 또는 Ctrl+휠로 확대·축소합니다. 확대된 이미지는 드래그나 방향키로 이동합니다. +, -, 0, Home 키로 배율을 조절합니다."
          class={viewportClasses}
          data-pannable={image.pannable()}
          data-dragging={image.dragging()}
          role="region"
          tabindex="0"
          ref={setElement}
          style={{
            '--image-height': `${image.view().height}px`,
            '--image-width': `${image.view().width}px`,
            '--image-x': `${image.view().x}px`,
            '--image-y': `${image.view().y}px`,
          }}
          onPointerDown={gestures.handleDown}
          onPointerMove={gestures.handleMove}
          onPointerUp={gestures.handleEnd}
          onPointerCancel={gestures.handleEnd}
          onLostPointerCapture={gestures.handleLost}
          onWheel={gestures.handleWheel}
          onKeyDown={gestures.handleKeyboard}
        >
          <img
            alt={props.path}
            class={imageClasses}
            draggable={false}
            src={props.src}
            onLoad={handleLoad}
            onError={() => props.onError?.()}
          />
        </div>
      </div>
    </div>
  )
}
