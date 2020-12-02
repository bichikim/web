import {createStyled, StyledSystems} from '@winter-love/emotion'
import {allProps} from './props'
import {Theme} from 'styled-system'

export type Systems<P, T extends Theme = Theme> = StyledSystems<P, T>

export default createStyled({
  props: allProps,
})
