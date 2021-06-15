import {isSSR} from '../is-ssr'

export const isListenable = (): boolean => {
  // eslint-disable-next-line @typescript-eslint/unbound-method
  return Boolean(!isSSR() && window.addEventListener && document.addEventListener)
}
