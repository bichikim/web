import {HTMLElement} from 'node-html-parser'
export type InsertPosition = 'beforebegin' | 'afterbegin' | 'beforeend' | 'afterend'

export const insertTags = (
  htmlElement: HTMLElement,
  selector: string,
  where: InsertPosition,
  tags?: string[],
) => {
  if (!tags) {
    return
  }
  const targetElement = htmlElement.querySelector(selector)
  if (targetElement) {
    tags.forEach((tag) => {
      targetElement.insertAdjacentHTML(where, tag)
    })
  }
}
