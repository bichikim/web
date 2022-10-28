import {HTMLElement} from 'node-html-parser'

export const entryFromTemplate = (template: HTMLElement) => {
  return template.querySelector('body script[type=module]')?.getAttribute('src')
}
