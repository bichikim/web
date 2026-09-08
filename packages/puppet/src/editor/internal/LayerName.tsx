import {createEffect, createSignal, onCleanup, onMount} from 'solid-js'

interface LayerNameProps {
  readonly name: string
  readonly selected?: boolean
}

export const LayerName = (props: LayerNameProps) => {
  let viewport: HTMLElement | undefined
  let text: HTMLSpanElement | undefined
  const [overflow, setOverflow] = createSignal(0)
  onMount(() => {
    const measure = () => {
      if (viewport !== undefined && text !== undefined) {
        setOverflow(Math.max(0, text.scrollWidth - viewport.clientWidth))
      }
    }
    createEffect(() => {
      props.name
      measure()
    })
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(measure)
      if (viewport !== undefined) {
        observer.observe(viewport)
      }
      if (text !== undefined) {
        observer.observe(text)
      }
      onCleanup(() => observer.disconnect())
    }
  })
  return (
    <strong
      ref={viewport}
      class="layer-name"
      title={props.name}
      data-scrolling={props.selected && overflow() > 0 ? '' : undefined}
    >
      <span class="layer-name-track">
        <span ref={text}>{props.name}</span>
        <span class="layer-name-copy" aria-hidden="true">
          {props.name}
        </span>
      </span>
    </strong>
  )
}
