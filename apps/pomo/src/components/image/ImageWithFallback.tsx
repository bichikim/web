import {createEffect, createSignal, type JSX, Show} from 'solid-js'

interface ImageWithFallbackProps {
  readonly alt: string
  readonly class?: string
  readonly fallback: JSX.Element
  readonly src?: string | null
}

export const ImageWithFallback = (props: ImageWithFallbackProps) => (
  <Show fallback={props.fallback} keyed when={props.src}>
    {(source) => {
      const [failed, setFailed] = createSignal(false)
      const [image, setImage] = createSignal<HTMLImageElement | null>(null)
      const handleError = () => setFailed(true)

      createEffect(() => {
        const element = image()
        if (element?.complete && element.naturalWidth === 0) {
          handleError()
        }
      })

      return (
        <Show fallback={props.fallback} when={!failed()}>
          <img
            ref={setImage}
            alt={props.alt}
            class={props.class}
            onError={handleError}
            src={source}
          />
        </Show>
      )
    }}
  </Show>
)
