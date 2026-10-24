import {expect, it} from 'vitest'
import {parseCheckpointFile} from '../checkpoint-file'

it('should rehydrate checkpoint parameter arrays for the model loader', () => {
  expect(
    parseCheckpointFile('{"version":1,"modelId":"demo","steps":2,"parameters":[0.5,1]}'),
  ).toEqual({modelId: 'demo', parameters: new Float32Array([0.5, 1]), steps: 2, version: 1})
})
it('should reject an incompatible format or nonfinite float32 parameters', () => {
  expect(() => parseCheckpointFile('{}')).toThrow(/체크포인트/)
  expect(() =>
    parseCheckpointFile('{"version":1,"modelId":"demo","steps":0,"parameters":[1e300]}'),
  ).toThrow(/finite/)
})
