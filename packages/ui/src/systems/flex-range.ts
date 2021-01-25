import css from '@styled-system/css'
import {parallelProps} from '@/utils'
import {ResponsiveValue} from 'styled-system'
import {SystemFunc} from '@/types'

export type Range = number | 'space' | 'auto' | 'force-space'

export interface DivisionProps {
  /**
   * @default 1
   */
  division?: ResponsiveValue<number>
}

export interface FlexRangeProps extends DivisionProps {
  offset?: ResponsiveValue<Range>
  range?: ResponsiveValue<Range>
}

export interface FlexColumnProps {
  column?: ResponsiveValue<boolean>
  reverse?: ResponsiveValue<boolean>
}

const HUNDRED = 100

interface GetOffsetMarginReturnType {
  marginBottom?: any
  marginTop?: any
  marginRight?: any
  marginLeft?: any
}

export const getOffsetMargin = (
  column: boolean,
  reverse: boolean,
  offset?: string | number): GetOffsetMarginReturnType => {
  if (typeof offset === 'undefined') {
    return {}
  }

  if (column) {
    if (reverse) {
      return {
        marginBottom: offset,
      }
    }
    return {
      marginTop: offset,
    }
  }

  if (reverse) {
    return {
      marginRight: offset,
    }
  }

  return {
    marginLeft: offset,
  }
}

const getBasis = (division: number, range?: number) => {
  if (range) {
    return `${HUNDRED * (1 / division) * range}%`
  }

  return range
}

export const flexRange: SystemFunc<FlexRangeProps & FlexColumnProps> =
  (props) => {
    const {range, division, column, reverse, offset} = props

    return css(
      parallelProps(
        {column, division, offset, range, reverse},
        ({column, division, offset, range, reverse}) => {
          const padding = getOffsetMargin(column, reverse, getBasis(division, offset))
          switch (range) {
            case 'auto':
              return {
                ...padding,
                flexBasis: 'auto',
                flexGrow: 0,
                flexShrink: 0,
              }
            case 'space':
              return {
                ...padding,
                flexBasis: '100%',
                flexGrow: 1,
                flexShrink: 1,
              }
            case 'force-space':
              return {
                ...padding,
                flexBasis: 'auto',
                flexGrow: 1,
                flexShrink: 1,
              }
          }
          return {
            ...padding,
            flexBasis: 'auto',
            flexGrow: 1,
            flexShrink: 0,
            width: getBasis(division, range),
          }
        },
      ),
    )
  }
