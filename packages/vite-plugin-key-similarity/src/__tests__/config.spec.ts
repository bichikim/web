import {access} from 'node:fs/promises'
import path from 'node:path'
import {describe, expect, it} from 'vitest'
import {resolveOptions} from '../config'

describe('resolveOptions', () => {
  it('should use the packaged q8 model by default', async () => {
    const options = resolveOptions(
      {
        keyDetector: () => undefined,
      },
      '/project',
    )

    expect(options.modelIdentifier).toBe('Xenova/multilingual-e5-small')
    expect(options.modelRevision).toBe('761b726')
    expect(options.modelPath).toMatch(/vite-plugin-key-similarity\/assets\/multilingual-e5-small$/)
    await expect(
      access(path.join(options.modelPath, 'onnx/model_quantized.onnx')),
    ).resolves.toBeUndefined()
  })

  it('should resolve a custom model override from the project root', () => {
    const options = resolveOptions(
      {
        keyDetector: () => undefined,
        modelPath: './models/custom',
      },
      '/project',
    )

    expect(options.modelIdentifier).toBe('/project/models/custom')
    expect(options.modelPath).toBe('/project/models/custom')
    expect(options.modelRevision).toBe('local')
  })

  it('should require a key detector at the public boundary', () => {
    expect(() =>
      resolveOptions(
        {
          keyDetector: undefined as never,
        },
        '/project',
      ),
    ).toThrow('keyDetector must be a function')
  })

  it('should preserve threshold resolver functions', () => {
    const semanticThreshold = (key: string) => (key.length < 5 ? 0.95 : 0.9)
    const options = resolveOptions(
      {
        keyDetector: () => undefined,
        semanticThreshold,
      },
      '/project',
    )

    expect(options.semanticThreshold).toBe(semanticThreshold)
  })

  it('should reject an invalid numeric threshold', () => {
    expect(() =>
      resolveOptions(
        {
          keyDetector: () => undefined,
          semanticThreshold: 2,
        },
        '/project',
      ),
    ).toThrow('semanticThreshold')
  })

  it('should reject error mode for asynchronous serve diagnostics', () => {
    expect(() =>
      resolveOptions(
        {
          keyDetector: () => undefined,
          serveMode: 'error' as never,
        },
        '/project',
      ),
    ).toThrow()
  })
})
