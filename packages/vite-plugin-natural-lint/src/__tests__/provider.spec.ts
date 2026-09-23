import {describe, expect, it} from 'vitest'
import {resolveLayaBackend} from '../provider'

describe('resolveLayaBackend', () => {
  it('should select CoreML automatically on Apple Silicon macOS', () => {
    expect(resolveLayaBackend('auto', {architecture: 'arm64', platform: 'darwin'})).toBe('coreml')
  })

  it('should select ONNX automatically on Linux', () => {
    expect(resolveLayaBackend('auto', {architecture: 'x64', platform: 'linux'})).toBe('onnx')
  })

  it('should preserve an explicitly selected backend', () => {
    expect(resolveLayaBackend('onnx', {architecture: 'arm64', platform: 'darwin'})).toBe('onnx')
  })
})
