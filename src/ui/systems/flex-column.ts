import css, {CssFunctionReturnType} from '@styled-system/css'
import {parallelProps} from '@/ui/utils'
import {ResponsiveValue} from 'styled-system'
import {SystemFunc} from '@/types'

export interface ColumnProps {
  column?: ResponsiveValue<boolean>
  /**
   * todo 잘되는 지 확인
   * reverse ordering
   */
  reverse?: boolean
}

export const column: SystemFunc<ColumnProps> = (props: ColumnProps): CssFunctionReturnType => {
  const {column, reverse} = props
  return css(parallelProps({column, reverse}, ({column, reverse}) => {
    const flexDirection = [column ? 'column' : 'row']

    if (reverse) {
      flexDirection.push('reverse')
    }

    return {
      flexDirection: flexDirection.join('-'),
    }
  }))
}
