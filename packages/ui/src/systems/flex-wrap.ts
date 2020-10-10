import {Property} from 'csstype'
import {ResponsiveValue, style} from 'styled-system'
import {SystemFunc} from '@/types'

export interface FlexEasyWrapProps {
  wrap?: ResponsiveValue<Property.FlexWrap | boolean>
}

export const flexEasyWrap: SystemFunc<FlexEasyWrapProps> = style({
  cssProperty: 'flexWrap',
  prop: 'wrap',
  transformValue(value: boolean) {
    switch (value) {
      case true:
        return 'wrap'
      case false:
        return 'no-wrap'
    }
    return value
  },
})
