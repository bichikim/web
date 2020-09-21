import {
  allSystem,
  AllSystemProps,
  ResponsiveValue,
  ShadowProps,
  show,
  ShowProps,
  textDecoration,
  Theme,
} from '@/ui/systems'
import fluid from 'fluid-system'
import {ASProps, System} from '../types'
import {variantComplex} from '../variant-complex'

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
  },
  textDecoration,
  fluid(allSystem),
  show,
  variantComplex({
    prop: 'textSet',
    scale: 'typography',
  }),
]
