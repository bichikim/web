import {getWindow} from '../get-window'

export const getDocument = (): Document | undefined => {
  return getWindow()?.document
}
