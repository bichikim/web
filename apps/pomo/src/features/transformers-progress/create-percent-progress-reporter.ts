import type {ProgressInfo} from '@huggingface/transformers'
import {clamp} from 'es-toolkit/math'

const MAXIMUM_PROGRESS = 100

/** Reports rounded loading percentages from Transformers.js progress totals. */
export const createPercentProgressReporter =
  (onPercent: (percent: number) => void) =>
  (progress: ProgressInfo): void => {
    if (progress.status !== 'progress_total') {
      return
    }

    onPercent(clamp(Math.round(progress.progress), 0, MAXIMUM_PROGRESS))
  }
