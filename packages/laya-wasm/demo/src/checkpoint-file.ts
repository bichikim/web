import {validateCheckpoint} from '../../src/checkpoint'
import {readObject} from '../../src/manifest'
import type {Checkpoint} from '../../src/types'

export const checkpointBlob = (checkpoint: Checkpoint): Blob =>
  new Blob([JSON.stringify({...checkpoint, parameters: Array.from(checkpoint.parameters)})], {
    type: 'application/json',
  })

export const parseCheckpointFile = (text: string): Checkpoint => {
  const data = readObject(JSON.parse(text))
  if (
    data.version !== 1 ||
    typeof data.modelId !== 'string' ||
    typeof data.steps !== 'number' ||
    !Array.isArray(data.parameters) ||
    !data.parameters.every((value: unknown): value is number => typeof value === 'number')
  ) {
    throw new TypeError('Laya 체크포인트 파일이 아닙니다.')
  }
  const checkpoint: Checkpoint = {
    modelId: data.modelId,
    parameters: Float32Array.from(data.parameters),
    steps: data.steps,
    version: 1,
  }
  validateCheckpoint(checkpoint, checkpoint.modelId, checkpoint.parameters.length)
  return checkpoint
}
