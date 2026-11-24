import {expect, it, vi} from 'vitest'
import type {ProgressInfo} from '@huggingface/transformers'
import {createModelProgress} from '../create-model-progress'

const total = (progress: number) =>
  ({
    files: {},
    loaded: progress,
    name: 'model',
    progress,
    status: 'progress_total',
    total: 100,
  }) satisfies ProgressInfo
const file = (name: string, progress: number) =>
  ({
    file: name,
    loaded: progress,
    name: 'model',
    progress,
    status: 'progress',
    total: 100,
  }) satisfies ProgressInfo

it('should display aggregate progress instead of alternating file percentages', () => {
  const status = vi.fn()
  const update = createModelProgress(status)
  update(file('decoder.onnx', 40))
  update(total(42.8))
  update(file('embedding.onnx', 0))
  update(file('decoder.onnx', 100))
  update(total(43.1))
  expect(status.mock.calls).toEqual([['모델 다운로드 중 · 42%'], ['모델 다운로드 중 · 43%']])
})

it('should suppress backward and repeated updates and show initialization after download', () => {
  const status = vi.fn()
  const update = createModelProgress(status)
  const updates = [40.4, 0, 39.9, 40.6, 41.2, 100, 70]
  updates.forEach((value) => update(total(value)))
  expect(status.mock.calls).toEqual([
    ['모델 다운로드 중 · 40%'],
    ['모델 다운로드 중 · 41%'],
    ['모델 불러오는 중'],
  ])
})

it('should retain the preparation notice when aggregate totals are unavailable', () => {
  const status = vi.fn()
  const update = createModelProgress(status)
  update(file('decoder.onnx', 40))
  update(total(Number.NaN))
  update({...total(50), total: 0})
  update({file: 'decoder.onnx', name: 'model', status: 'done'})
  expect(status).not.toHaveBeenCalled()
})

it('should start a new loading operation with independent progress', () => {
  const status = vi.fn()
  createModelProgress(status)(total(100))
  createModelProgress(status)(total(0))
  expect(status.mock.calls).toEqual([['모델 불러오는 중'], ['모델 다운로드 중 · 0%']])
})
