import {
  allSystem,
  AllSystemProps,
  ResponsiveValue,
  ShadowProps,
  show,
  ShowProps,
  Theme,
} from 'src/systems'
import {ASProps, System} from 'src/types'
import {variantComplex} from 'src/utils'

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
  allSystem,
  show,
  variantComplex({
    prop: 'textSet',
    scale: 'typography',
  }),
]
