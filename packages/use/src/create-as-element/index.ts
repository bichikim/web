import {Children} from 'src/types'
import {isComponent} from 'src/is-component'
import {h} from 'vue'

export const createAsElement = (as: any, props: Record<string, any>, children?: () => Children) => {
  return h(as, props, isComponent(as) ? children : children?.())
}
