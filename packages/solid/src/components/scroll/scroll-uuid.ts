import {createUuid} from '@winter-love/utils'

const uuid = createUuid()
export const scrollUuid = () => {
  return `__scroll_${uuid()}`
}
