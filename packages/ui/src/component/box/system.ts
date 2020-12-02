import {AllSystemProps, ResponsiveValue, ShowProps} from '@/systems'
import {CSSObject} from '@winter-love/emotion'
import {ASProps} from 'src/types'

export interface textSetVariantProps {
  textSet?: ResponsiveValue<string>
}

export interface RefProps {
  ref?: any
}

export type Props =
  & ASProps
  & RefProps
  & ShowProps
  & textSetVariantProps
  & AllSystemProps

export const defaultStyle: CSSObject<any> = {
  boxSizing: 'border-box',
  display: 'block',
  width: '100%',
  color: 'black',
  textDecoration: 'none',
  height: '100%',
  border: 0,
  margin: 0,
  backgroundColor: 'transparent',
  outline: 'none !important',
  fontSize: '1rem',
  overflow: 'visible',
}
