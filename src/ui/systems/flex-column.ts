import css from '@styled-system/css'
import {parallelProps} from '../parallel-props'
import {ResponsiveValue} from 'styled-system'

export interface ColumnProps {
  column?: ResponsiveValue<boolean>
  /**
   * todo 잘되는 지 확인
   * reverse ordering
   */
  reverse?: boolean
}

export const column = (props: ColumnProps) => {
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
