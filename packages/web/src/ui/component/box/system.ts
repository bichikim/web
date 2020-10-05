import {
  allSystem,
  AllSystemProps,
  ResponsiveValue,
  ShadowProps,
  show,
  ShowProps,
  Theme,
} from '@/ui/systems'
import fluid from 'fluid-system'
import {ASProps, System} from '@/types'
import {variantComplex} from '@/utils'

export interface textSetVariantProps {
  textSet?: ResponsiveValue<string>
}

export interface RefProps {
  ref?: any
}

export type Props =
  & ASProps
  & RefProps
  & ShadowProps
  & ShowProps
  & textSetVariantProps
  & AllSystemProps

export const boxSystem: System<Props, Theme> = [
  {
    boxSizing: 'border-box',
    display: 'block',
    width: '100%',
    color: 'inherit',
    textDecoration: 'inherit',
    height: '100%',
    padding: '0',
    border: 0,
    margin: 0,
    backgroundColor: 'transparent',
    outline: 'none !important',
    fontSize: '1rem',
    overflow: 'hidden',
    '&:visited': {

    },
  },
  fluid(allSystem),
  show,
  variantComplex({
    prop: 'textSet',
    scale: 'typography',
  }),
]
