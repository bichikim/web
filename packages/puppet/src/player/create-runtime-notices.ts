import type {RuntimeNotice, RuntimeNoticeInput, RuntimeNoticesState} from './runtime-notice-types'

/** Retains speculative notifications until the host acknowledges their presented sequence. */
export const createRuntimeNotices = () => {
  let sequence = 0
  let pending: RuntimeNotice[] = []
  return {
    acknowledge(accepted: number) {
      pending = pending.filter((notice) => notice.sequence > accepted)
    },
    capture: (): RuntimeNoticesState => ({pending: [...pending], sequence}),
    clear() {
      pending = []
    },
    emit(notice: RuntimeNoticeInput) {
      sequence += 1
      pending.push({...notice, sequence})
    },
    restore(state: RuntimeNoticesState) {
      sequence = state.sequence
      pending = [...state.pending]
    },
  }
}
