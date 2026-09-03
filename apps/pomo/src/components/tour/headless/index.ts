import {Dialog} from '@kobalte/core/dialog'
import {freeze} from '@winter-love/utils'

import {HTourContent} from './HTourContent'
import {HTourRoot} from './HTourRoot'
import {HTourSpotlight} from './HTourSpotlight'

export * from './HTourContent'
export * from './HTourRoot'
export * from './HTourSpotlight'
export * from './types'

export const HTour = freeze({
  CloseButton: Dialog.CloseButton,
  Content: HTourContent,
  Description: Dialog.Description,
  Portal: Dialog.Portal,
  Root: HTourRoot,
  Spotlight: HTourSpotlight,
  Title: Dialog.Title,
})
