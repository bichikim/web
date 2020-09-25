import {
  allSystem,
  AllSystemProps,
  ResponsiveValue,
  ShadowProps,
  show,
  ShowProps,
  textDecoration,
  borderShort,
  Theme,
} from '@/ui/systems'
import fluid from 'fluid-system'
import {ASProps, System} from '@/types'
import {variantComplex} from '@/ui/utils'

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
    height: '100%',
    padding: '0',
    border: 0,
    margin: 0,
    backgroundColor: 'transparent',
    outline: 'none !important',
    overflow: 'hidden',
  },
  textDecoration,
  fluid(allSystem),
  borderShort,
  show,
  variantComplex({
    prop: 'textSet',
    scale: 'typography',
  }),
]
