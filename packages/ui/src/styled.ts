import {createStyled, StyledSystems} from 'packages/ui/emotion'
import {allProps} from 'packages/ui/props'

export type Systems = StyledSystems

export default createStyled({
  props: allProps,
})
