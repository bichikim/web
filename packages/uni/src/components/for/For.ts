import {FunctionalComponent} from 'vue'

export interface ForProps {
  each?: any[]
}

export const For: FunctionalComponent<ForProps> = (props, {slots}) => {
  const {each} = props

  if (!each || each.length === 0) {
    return slots.fallback?.()
  }

  return each.map((item, index) => slots.default?.({index, item}))
}

For.props = {
  each: null,
}
