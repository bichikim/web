import {FunctionalComponent} from 'vue'

export interface ForProps {
  each?: any[]
}

export const UFor: FunctionalComponent<ForProps> = (props, {slots}) => {
  const {each} = props

  if (!each || each.length === 0) {
    return slots.fallback?.()
  }

  return each.map((item, index) => slots.default?.({index, item}))
}

UFor.props = {
  each: null,
}
