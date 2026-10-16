import type {Checkpoint} from './types'

export const validateCheckpoint = (
  checkpoint: Checkpoint,
  modelId: string,
  count: number,
): void => {
  if (checkpoint.version !== 1 || checkpoint.modelId !== modelId) {
    throw new TypeError('Checkpoint model or version does not match.')
  }
  if (!Number.isSafeInteger(checkpoint.steps) || checkpoint.steps < 0) {
    throw new TypeError('Checkpoint steps must be a nonnegative integer.')
  }
  if (!(checkpoint.parameters instanceof Float32Array) || checkpoint.parameters.length !== count) {
    throw new TypeError('Checkpoint parameter count does not match.')
  }
  if (!checkpoint.parameters.every(Number.isFinite)) {
    throw new TypeError('Checkpoint parameters must be finite.')
  }
}
