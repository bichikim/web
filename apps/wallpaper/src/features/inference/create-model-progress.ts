import type {ProgressInfo} from '@huggingface/transformers'

const COMPLETE_PERCENT = 100

/** Reports whole-model download progress, then initialization, once per forward step. */
export const createModelProgress = (
  onStatus: (text: string) => void,
): ((event: ProgressInfo) => void) => {
  let previous = -1
  return (event) => {
    if (event.status !== 'progress_total' || event.total <= 0 || !Number.isFinite(event.progress)) {
      return
    }
    const percent = Math.max(0, Math.min(COMPLETE_PERCENT, Math.floor(event.progress)))
    if (percent <= previous) {
      return
    }
    previous = percent
    onStatus(percent === COMPLETE_PERCENT ? '모델 불러오는 중' : `모델 다운로드 중 · ${percent}%`)
  }
}
