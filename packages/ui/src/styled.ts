import {createStyled, StyledSystems} from '@innovirus/emotion'
import {allProps} from './props'

export type Systems<P, T> = StyledSystems<P, T>

export default createStyled({
  props: allProps,
})
