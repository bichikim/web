import {HTMLElement} from 'node-html-parser'

export const insertTeleports = (
  htmlElement: HTMLElement,
  teleports?: Record<string, string>,
) => {
  if (!teleports) {
    return
  }
  for (const key of Object.keys(teleports)) {
    const element = htmlElement.querySelector(key)
    if (element) {
      element.insertAdjacentHTML('afterbegin', teleports[key])
    }
  }
}
