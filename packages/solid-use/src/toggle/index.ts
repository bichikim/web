import {createSignal} from 'solid-js'

export const useToggle = () => {
  const [toggle, setToggle] = createSignal(false)

  return [
    toggle,
    () => {
      setToggle((value) => !value)
    },
  ]
}
