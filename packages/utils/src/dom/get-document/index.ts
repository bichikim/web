import {getWindow} from 'src/dom/get-window'

export const getDocument = () => {
  return getWindow()?.document
}
