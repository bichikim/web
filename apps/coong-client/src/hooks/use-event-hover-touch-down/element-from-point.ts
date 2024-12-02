import {getDocument} from '@winter-love/utils'
export const elementFromPoint = (x: number, y: number): Element | undefined => {
  return getDocument()?.elementFromPoint(x, y) ?? undefined
}
