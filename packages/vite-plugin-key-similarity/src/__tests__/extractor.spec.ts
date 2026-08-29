import {describe, expect, it, vi} from 'vitest'
import {extractKeys} from '../extractor'
import type {KeyDetector} from '../types'

const detectTranslation: KeyDetector = ({imported, source}) =>
  imported === 't' && source === '@/i18n' ? 0 : undefined

describe('extractKeys', () => {
  it.each(['ts', 'tsx', 'js', 'jsx'])(
    'should let one detector select direct and aliased imports from %s',
    (extension) => {
      const code = `
        import {t, t as translate} from '@/i18n'
        import {t as other} from '@/other'
        const one = t('작은따옴표')
        const two = translate("큰따옴표")
        const three = t(\`정적 템플릿\`)
        const ignored = other('다른 모듈')
        const member = obj.t('멤버 호출')
        // t('주석')
        const fake = "t('문자열')"
      `
      const result = extractKeys(code, `/src/example.${extension}`, detectTranslation)

      expect(result.entries.map((entry) => entry.originalText)).toEqual([
        '작은따옴표',
        '큰따옴표',
        '정적 템플릿',
      ])
      expect(result.dynamicCalls).toEqual([])
      expect(result.entries[0]).toMatchObject({
        group: undefined,
        imported: 't',
        literalKind: 'single',
        position: {column: 21, line: 4},
        source: '@/i18n',
      })
    },
  )

  it.each([
    {
      code: `const run = (t: (value: string) => string) => t('parameter')`,
      name: 'function parameter',
    },
    {
      code: `{ const t = (value: string) => value; t('block') }`,
      name: 'block variable',
    },
    {
      code: `function run() { if (true) { var t = (value: string) => value }; t('var') }`,
      name: 'function variable',
    },
    {
      code: `try { throw new Error() } catch (t) { t('catch') }`,
      name: 'catch binding',
    },
    {
      code: `for (const t of [(value: string) => value]) { t('loop') }`,
      name: 'loop binding',
    },
    {
      code: `const run = ({t}: {t: (value: string) => string}) => t('binding pattern')`,
      name: 'binding pattern',
    },
    {
      code: `{ t('before declaration'); function t(value: string) { return value } }`,
      name: 'function declaration',
    },
    {
      code: `const run = function t() { return t('function expression') }`,
      name: 'named function expression',
    },
    {
      code: `class Container { static { { var t = (value: string) => value } t('static block') } }`,
      name: 'class static block variable',
    },
    {
      code: `async function run() { if (true) { var t = (value: string) => value } return t('async') }`,
      name: 'async function variable',
    },
    {
      code: `function* run() { if (true) { var t = (value: string) => value } yield t('generator') }`,
      name: 'generator variable',
    },
    {
      code: `namespace Container { var t = (value: string) => value; t('namespace') }`,
      name: 'namespace variable',
    },
  ])('should ignore an import name shadowed by a $name', ({code}) => {
    const result = extractKeys(
      [`import {t} from '@/i18n'`, `t('before')`, code, `t('after')`].join('\n'),
      '/src/example.ts',
      detectTranslation,
    )

    expect(result.entries.map((entry) => entry.originalText)).toEqual(['before', 'after'])
    expect(result.dynamicCalls).toEqual([])
  })

  it('should keep extracting an unshadowed aliased import in a nested scope', () => {
    const result = extractKeys(
      [
        `import {t as translate} from '@/i18n'`,
        `const run = () => {`,
        `  const t = (value: string) => value`,
        `  return translate('nested import') + t('local')`,
        `}`,
      ].join('\n'),
      '/src/example.ts',
      detectTranslation,
    )

    expect(result.entries.map((entry) => entry.originalText)).toEqual(['nested import'])
    expect(result.dynamicCalls).toEqual([])
  })

  it('should not treat an ambient external module name as a lexical binding', () => {
    const result = extractKeys(
      [`import {t} from '@/i18n'`, `declare module 't' {}`, `t('import')`].join('\n'),
      '/src/example.ts',
      detectTranslation,
    )

    expect(result.entries.map((entry) => entry.originalText)).toEqual(['import'])
    expect(result.dynamicCalls).toEqual([])
  })

  it('should reconstruct simple template expressions as literal placeholders', () => {
    const result = extractKeys(
      `import {t} from '@/i18n'; t("이메일 \${email}"); t(\`이메일 \${email}\`); t(\`이메일 \${user.profile.email}\`)`,
      '/src/example.ts',
      detectTranslation,
    )

    expect(result.entries.map((entry) => entry.originalText)).toEqual([
      `이메일 \${email}`,
      `이메일 \${email}`,
      `이메일 \${user.profile.email}`,
    ])
    expect(result.entries.map((entry) => entry.comparisons[0]?.normalizedText)).toEqual([
      `이메일 \${email}`,
      `이메일 \${email}`,
      `이메일 \${user.profile.email}`,
    ])
    expect(result.entries.map((entry) => entry.literalKind)).toEqual([
      'double',
      'template',
      'template',
    ])
    expect(result.dynamicCalls).toEqual([])
  })

  it('should report unsupported key expressions as dynamic', () => {
    const result = extractKeys(
      `import {t} from '@/i18n'; t(value); t(\`hello \${getName()}\`); t(\`hello \${name ?? fallback}\`)`,
      '/src/example.ts',
      detectTranslation,
    )

    expect(result.entries).toEqual([])
    expect(result.dynamicCalls).toHaveLength(3)
  })

  it('should let the detector select a source, argument, and group together', () => {
    const detector = vi.fn<KeyDetector>((context) => {
      if (context.source !== '@/events' || context.imported !== 'emit') {
        return undefined
      }
      return context.arguments[1]?.value?.startsWith('checkout.')
        ? {argumentIndex: 1, group: 'analytics'}
        : undefined
    })
    const code = [
      `import {emit as sendEvent} from '@/events'`,
      `import {emit as other} from '@/other'`,
      `sendEvent({total: 10}, 'checkout.completed')`,
      `sendEvent({}, 'other')`,
      `other({}, 'checkout.ignored')`,
    ].join('; ')
    const result = extractKeys(code, '/src/example.ts', detector)

    expect(result.entries).toMatchObject([{group: 'analytics', originalText: 'checkout.completed'}])
    expect(detector).toHaveBeenCalledTimes(3)
    expect(detector.mock.calls[0]?.[0]).toMatchObject({
      arguments: [
        {kind: 'dynamic', value: undefined},
        {kind: 'string', value: 'checkout.completed'},
      ],
      imported: 'emit',
      localName: 'sendEvent',
      source: '@/events',
    })
  })

  it.each([
    [-1, 'invalid argument index'],
    [{argumentIndex: 0, group: ''}, 'empty group'],
  ])('should reject an invalid detector result %#', (detection, message) => {
    expect(() =>
      extractKeys(`import {t} from '@/i18n'; t('key')`, '/src/example.ts', () => detection),
    ).toThrow(message)
  })

  it('should resolve function thresholds for each extracted key', () => {
    const semanticThreshold = vi.fn((key: string) => (key.length < 5 ? 0.95 : 0.9))
    const result = extractKeys(
      `import {t} from '@/i18n'; t('짧음')`,
      '/src/example.ts',
      detectTranslation,
      {semanticThreshold},
    )

    expect(semanticThreshold).toHaveBeenCalledWith('짧음')
    expect(result.entries[0]?.comparisons[0]).toMatchObject({semanticThreshold: 0.95})
  })

  it('should add one or more annotated aliases to one call', () => {
    const result = extractKeys(
      [
        `import {t} from '@/i18n'`,
        `/* @key-similarity-with A */`,
        `/* @key-similarity-with C */`,
        `export const value = t('B')`,
      ].join('\n'),
      '/src/example.ts',
      detectTranslation,
    )

    expect(result.entries).toHaveLength(1)
    expect(result.entries[0]?.originalText).toBe('B')
    expect(result.entries[0]?.comparisons.map((comparison) => comparison.originalText)).toEqual([
      'B',
      'A',
      'C',
    ])
  })

  it('should exclude only the literal when an alias is combined with ignore-literal', () => {
    const result = extractKeys(
      [
        `import {t} from '@/i18n'`,
        `/* @key-similarity-with A */`,
        `/* @key-similarity-ignore-literal */`,
        `t('B')`,
      ].join('\n'),
      '/src/example.ts',
      detectTranslation,
    )

    expect(result.entries).toHaveLength(1)
    expect(result.entries[0]).toMatchObject({originalText: 'B'})
    expect(result.entries[0]?.comparisons.map((comparison) => comparison.originalText)).toEqual([
      'A',
    ])
  })

  it('should ignore a call when ignore-literal leaves no comparison text', () => {
    const result = extractKeys(
      [`import {t} from '@/i18n'`, `/* @key-similarity-ignore-literal */`, `t('B')`].join('\n'),
      '/src/example.ts',
      detectTranslation,
    )

    expect(result).toEqual({dynamicCalls: [], entries: []})
  })

  it('should not bind annotations separated from the call by a blank line', () => {
    const result = extractKeys(
      [`import {t} from '@/i18n'`, `/* @key-similarity-with A */`, ``, `t('B')`].join('\n'),
      '/src/example.ts',
      detectTranslation,
    )

    expect(result.entries[0]?.comparisons.map((comparison) => comparison.originalText)).toEqual([
      'B',
    ])
  })

  it('should resolve thresholds for the literal and every alias', () => {
    const semanticThreshold = vi.fn(() => 0.9)
    const result = extractKeys(
      [`import {t} from '@/i18n'`, `/* @key-similarity-with 별칭 */`, `t('원문')`].join('\n'),
      '/src/example.ts',
      detectTranslation,
      {semanticThreshold},
    )

    expect(semanticThreshold.mock.calls).toEqual([['원문'], ['별칭']])
    expect(result.entries[0]?.comparisons).toHaveLength(2)
  })

  it('should reject a with annotation without a key', () => {
    expect(() =>
      extractKeys(
        [`import {t} from '@/i18n'`, `/* @key-similarity-with */`, `t('B')`].join('\n'),
        '/src/example.ts',
        detectTranslation,
      ),
    ).toThrow('@key-similarity-with requires a key')
  })

  it('should reject an invalid resolved threshold', () => {
    expect(() =>
      extractKeys(`import {t} from '@/i18n'; t('key')`, '/src/example.ts', detectTranslation, {
        semanticThreshold: () => 2,
      }),
    ).toThrow('semanticThreshold')
  })
})
