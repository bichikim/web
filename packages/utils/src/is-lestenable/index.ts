import {isSSR} from '../is-ssr'

export const isListenable = (): boolean => {
  return Boolean(!isSSR() && window.addEventListener && document.addEventListener)
}
