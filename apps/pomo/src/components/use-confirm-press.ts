import {type Accessor, createSignal} from 'solid-js'

export interface UseConfirmPressProps {
  readonly onConfirm: () => void
}

export interface ConfirmPress {
  readonly isConfirming: Accessor<boolean>
  readonly press: () => void
  readonly reset: () => void
}

/** Requires two consecutive presses before invoking an action. */
export const useConfirmPress = (props: UseConfirmPressProps): ConfirmPress => {
  const [isConfirming, setIsConfirming] = createSignal(false)

  const press = () => {
    if (!isConfirming()) {
      setIsConfirming(true)
      return
    }

    setIsConfirming(false)
    props.onConfirm()
  }

  return {
    isConfirming,
    press,
    reset: () => setIsConfirming(false),
  }
}
