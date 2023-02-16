import {Children} from 'src/types'
import {isComponent} from 'src/checks/is-component'
import {h} from 'vue'

/**
 * 이 함수는 createElement (vue.h) 에서 type string 일때와 Component 일때를 구분하여 자식을 적용 합니다
 * @param as
 * @param props
 * @param children
 */
export const createAsElement = (as: any, props: Record<string, any>, children?: () => Children) => {
  return h(as, props, isComponent(as) ? children : children?.())
}
