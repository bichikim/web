import {HTMLElement} from 'node-html-parser'

export const insertTeleports = (
  htmlElement: HTMLElement,
  teleports?: Record<string, string>,
) => {
  if (!teleports) {
    return
  }
  Object.keys(teleports).forEach((key) => {
    const element = htmlElement.querySelector(key)
    if (element) {
      element.insertAdjacentHTML('afterbegin', teleports[key])
    }
  })
}
