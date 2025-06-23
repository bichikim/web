import {createEffect, createSignal, onCleanup} from 'solid-js'
import tadaJson from './tada.json?url'

/**
 * lazy load lottie-web
 */
const getLottie = async () => {
  const module = await import('lottie-web')

  return module?.default ?? module
}

export const TadaDemo = () => {
  const [element, setElement] = createSignal<HTMLDivElement | null>(null)

  /**
   * client side load lottie
   */
  createEffect(async () => {
    const lottie = await getLottie()

    const _element = element()

    if (!_element) {
      return
    }

    const animation = lottie.loadAnimation({
      autoplay: true,
      container: _element,
      loop: true,
      path: tadaJson,
      renderer: 'svg',
    })

    onCleanup(() => {
      animation.destroy()
    })
  })

  return <div class="w-50 h-50" ref={setElement}></div>
}
