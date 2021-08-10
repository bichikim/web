import {isSSR} from '@winter-love/utils'

export const useBlur = () => {
  return () => {
    if (isSSR()) {
      return
    }
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
  }
}
