import {createSignal} from 'solid-js'

export const useStudioTourHint = (enter: () => boolean, openTour: () => void) => {
  const [visible, setVisible] = createSignal(false)
  return {
    dismiss: () => setVisible(false),
    visible,
    enter: () => {
      if (enter()) {
        setVisible(true)
      }
    },
    openTour: () => {
      setVisible(false)
      openTour()
    },
  }
}
