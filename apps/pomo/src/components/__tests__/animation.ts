import {fireEvent} from '@solidjs/testing-library'

export const finishAnimation = (element: Element, animationName: string) =>
  fireEvent(element, Object.assign(new Event('animationend', {bubbles: true}), {animationName}))
