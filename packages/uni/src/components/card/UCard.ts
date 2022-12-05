import {styled, VariantProps} from 'src/style'
import {HCard} from './HCard'

export const UCard = styled(
  HCard,
  {
    '& .content': {
      borderRadius: '8px',
      p: '12px',
    },
    '& .indicator': {
      fill: '$back',
      flexGrow: 0,
      height: '6px',
      px: 15,
      width: '11px',
    },
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
    width: 'fit-content',
  },
  {
    defaultVariants: {
      bg: 'base',
      indicator: 'none',
    },
    variants: {
      bg: {
        base: {
          '& .content': {
            backgroundColor: '$back',
            color: '$baseDark',
          },
        },
      },
      indicator: {
        centerBottom: {
          '& .indicator': {
            transform: 'scaleY(-1)',
          },
          flexDirection: 'column-reverse',
        },
        centerTop: {
          // empty
        },
        endBottom: {
          '& .indicator': {
            mx: -2.5,
            px: 0,
            py: 15,
            transform: 'rotate(90deg)',
          },
          alignItems: 'end',
          flexDirection: 'row-reverse',
        },
        endCenter: {
          '& .indicator': {
            mx: -2.5,
            px: 0,
            py: 15,
            transform: 'rotate(90deg)',
          },
          flexDirection: 'row-reverse',
        },
        endTop: {
          '& .indicator': {
            mx: -2.5,
            px: 0,
            py: 15,
            transform: 'rotate(90deg)',
          },
          alignItems: 'start',
          flexDirection: 'row-reverse',
        },
        leftBottom: {
          '& .indicator': {
            transform: 'scaleY(-1)',
          },
          alignItems: 'start',
          flexDirection: 'column-reverse',
        },
        leftTop: {
          alignItems: 'start',
        },
        none: {
          '& .indicator': {
            display: 'none',
          },
        },
        rightBottom: {
          '& .indicator': {
            transform: 'scaleY(-1)',
          },
          alignItems: 'end',
          flexDirection: 'column-reverse',
        },
        rightTop: {
          alignItems: 'end',
        },
        startBottom: {
          '& .indicator': {
            mx: -2.5,
            px: 0,
            py: 15,
            transform: 'rotate(270deg)',
          },
          alignItems: 'end',
          flexDirection: 'row',
        },
        startCenter: {
          '& .indicator': {
            mx: -2.5,
            px: 0,
            py: 15,
            transform: 'rotate(270deg)',
          },
          flexDirection: 'row',
        },
        startTop: {
          '& .indicator': {
            mx: -2.5,
            px: 0,
            py: 15,
            transform: 'rotate(270deg)',
          },
          alignItems: 'start',
          flexDirection: 'row',
        },
      },
    },
  },
)

export type UCardVariants = VariantProps<typeof UCard>
