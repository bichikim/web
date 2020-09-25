import {createStyled, StyledSystems} from '@/lib/emotion/styled'
import {allProps} from './props'

export type Systems = StyledSystems

export default createStyled({
  props: allProps,
})
