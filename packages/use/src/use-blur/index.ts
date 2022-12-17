import {getDocument, getHtmlElementClass} from 'src/_imports/utils'

/**
 * 지금 돔에서 포커싱 된 엘리먼트를 blur 동작을 실행시킵니다
 */
export const useBlur = () => {
  return () => {
    const document = getDocument()
    const HTMLElement = getHtmlElementClass()
    if (!document || !HTMLElement) {
      return
    }
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
  }
}
