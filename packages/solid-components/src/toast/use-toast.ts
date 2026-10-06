import {useContext} from 'solid-js'
import {ToastContext, ToastInnerContext} from './context'

export const useToast = () => {
  const actions = useContext(ToastContext)
  const state = useContext(ToastInnerContext)
  return {
    count: state.count,
    dismissToast: actions.dismissToast,
    showToast: actions.showToast,
    waitingCount: state.waitingCount,
  }
}
