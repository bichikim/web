import {cx} from 'class-variance-authority'
import {createEffect, createSignal, type JSX, Show} from 'solid-js'

export interface ImageProps {
  readonly alt?: string
  readonly children?: JSX.Element
  readonly class?: string
  readonly fallback?: JSX.Element
  readonly height?: number
  readonly imageClass?: string
  readonly loading?: 'eager' | 'lazy'
  readonly placeholder?: JSX.Element
  readonly src?: string
  readonly width?: number
}

/** Shows a placeholder while loading, an error fallback on failure, and children once loaded. */
export const Image = (props: ImageProps) => (
  <Show
    when={props.src}
    keyed
    fallback={
      <div class={cx('relative min-w-0', props.class)} aria-busy={false}>
        {props.fallback ?? props.placeholder ?? props.alt}
      </div>
    }
  >
    {(source) => {
      const [status, setStatus] = createSignal<'error' | 'loaded' | 'loading'>('loading')
      const [image, setImage] = createSignal<HTMLImageElement | null>(null)
      const handleLoad = () => setStatus('loaded')
      const handleError = () => setStatus('error')

      createEffect(() => {
        const element = image()
        if (element !== null && element.getAttribute('src') === source && element.complete) {
          setStatus(element.naturalWidth > 0 ? 'loaded' : 'error')
        }
      })

      return (
        <div class={cx('relative min-w-0', props.class)} aria-busy={status() === 'loading'}>
          <img
            ref={setImage}
            alt={props.alt ?? ''}
            aria-hidden={status() !== 'loaded' || (props.alt ?? '') === ''}
            class={cx(
              'block h-full w-full',
              props.imageClass,
              status() !== 'loaded' && 'invisible',
            )}
            decoding="async"
            height={props.height}
            loading={props.loading}
            onError={handleError}
            onLoad={handleLoad}
            src={source}
            width={props.width}
          />
          <Show
            when={status() === 'loaded'}
            fallback={
              <div class="absolute inset-0">
                {status() === 'error'
                  ? (props.fallback ?? props.placeholder ?? props.alt)
                  : props.placeholder}
              </div>
            }
          >
            {props.children}
          </Show>
        </div>
      )
    }}
  </Show>
)
