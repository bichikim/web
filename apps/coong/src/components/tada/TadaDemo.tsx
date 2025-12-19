import {createEffect, createSignal, onCleanup} from 'solid-js'
import tadaJson from './tada.json?url'
import {Lottie} from 'src/components/lottie/Lottie'

/**
 * lazy load lottie-web
 */
const getLottie = async () => {
  const module = await import('lottie-web')

  return module?.default ?? module
}

export const TadaDemo = () => {
  return <Lottie src={tadaJson} play="autoplay" loop />
}
