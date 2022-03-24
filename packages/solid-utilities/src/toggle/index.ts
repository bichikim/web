import {createMutable} from 'solid-js/store'
import {createWrap} from '../wrap'

export interface UseToggleProps {
  initState?: boolean
}

export const createToggle = (props: UseToggleProps) => {
  const [value, setValue] = createWrap(createMutable({
    value: props.initState,
  }))

  const toggle = (value?: boolean) => {
    if (typeof value === 'boolean') {
      setValue(() => value)
    }
  }

  return [value, toggle]
}
