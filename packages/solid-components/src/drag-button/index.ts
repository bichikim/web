import {freeze} from '@winter-love/utils'
import {HDragButtonBody} from './HDragButtonBody'
import {HDragButtonAside} from './HDragButtonAside'
import {HDragButtonContent} from './HDragButtonContent'
import {HDragButtonRoot} from './HDragButtonRoot'

export * from './HDragButton'
export * from './HDragButtonAside'
export * from './HDragButtonBody'
export * from './HDragButtonContent'
export * from './HDragButtonRoot'

export const DragButton = freeze({
  Aside: HDragButtonAside,
  Body: HDragButtonBody,
  Content: HDragButtonContent,
  Root: HDragButtonRoot,
})
