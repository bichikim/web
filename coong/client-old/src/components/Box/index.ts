import {FunctionalComponent} from 'vue'
import {styled} from 'src/plugins/hyper-components'
import {ShortHeadProperties, StyleProperties} from 'src/design-system'

export interface BoxProps {
  as?: any
  css?: ShortHeadProperties & StyleProperties
  variants?: Record<string, any>
}

export const Box: FunctionalComponent<BoxProps> = styled('div', {
  name: 'box',
  target: 'box',
  // 타입 재정의
}, {}) as any
