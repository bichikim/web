import {describe, expect, it} from 'vitest'
import {resolveOptions} from '../config'

describe('resolveOptions', () => {
  it('should share the default q8 model cache across unrelated project roots', () => {
    const options = resolveOptions(
      {
        keyDetector: () => undefined,
      },
      '/project',
    )

    expect(options.modelIdentifier).toBe('Xenova/multilingual-e5-small')
    expect(options.modelRevision).toBe('761b726')
    expect(options.modelPath).toContain('io.winterlove.models')
    expect(options.modelPath).toContain('multilingual-e5-small')
    expect(options.modelPath).not.toContain('/project')
    expect(resolveOptions({keyDetector: () => undefined}, '/another-project').modelPath).toBe(
      options.modelPath,
    )
    expect(options.skipIdenticalKeys).toBe(false)
  })

  it('should preserve the identical-key skip option', () => {
    const options = resolveOptions(
      {
        keyDetector: () => undefined,
        skipIdenticalKeys: true,
      },
      '/project',
    )

    expect(options.skipIdenticalKeys).toBe(true)
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
