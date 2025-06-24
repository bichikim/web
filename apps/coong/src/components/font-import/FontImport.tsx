import {onMount} from 'solid-js'
import {fontImport} from './font-import'

/**
 * async import font css in client side
 * @returns
 */
export const FontImport = () => {
  onMount(() => {
    return fontImport()
  })

  return null
}
