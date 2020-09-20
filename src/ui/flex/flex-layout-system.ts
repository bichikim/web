import {show, ShowProps} from '@/ui/systems'
import fluid from 'fluid-system'
import {border, BorderProps, compose, layout, LayoutProps, shadow, ShadowProps} from 'styled-system'

export type FlexLayoutProps = BorderProps & LayoutProps & ShadowProps
  & ShowProps & JSX.IntrinsicElements['div']
export const flexLayoutSystem = [
  {
    display: 'flow-root',
    height: '100%',
    position: 'relative',
    width: '100%',
  },
  show,
  fluid(compose(layout, shadow, border)),
]
