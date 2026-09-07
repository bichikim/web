import {describe, expect, it} from 'vitest'

import {decideRelease, findHighestVersion} from '../decision.mjs'

describe('decideRelease', () => {
  it('should skip publication when the repository version equals npm', () => {
    expect(
      decideRelease({
        localVersion: '1.2.3',
        publishedVersion: '1.2.3',
        sourceChanged: true,
      }),
    ).toMatchObject({code: 'VERSION_UNCHANGED', status: 'skip'})
  })

  it('should publish the next patch without a source change', () => {
    expect(
      decideRelease({
        localVersion: '1.2.4',
        publishedVersion: '1.2.3',
        sourceChanged: false,
      }),
    ).toMatchObject({bump: 'patch', code: 'RELEASE_READY', status: 'publish'})
  })

  it('should publish a higher patch without requiring every intermediate version', () => {
    expect(
      decideRelease({
        localVersion: '1.2.6',
        publishedVersion: '1.2.3',
        sourceChanged: false,
      }),
    ).toMatchObject({bump: 'patch', code: 'RELEASE_READY', status: 'publish'})
  })

  it.each([
    ['minor', '1.4.1'],
    ['major', '3.1.0'],
  ])('should publish the next %s when package source changed', (bump, localVersion) => {
    expect(
      decideRelease({localVersion, publishedVersion: '1.2.3', sourceChanged: true}),
    ).toMatchObject({bump, code: 'RELEASE_READY', status: 'publish'})
  })

  it.each([
    ['minor', '1.3.0'],
    ['major', '2.0.0'],
  ])('should reject a %s version without a package source change', (bump, localVersion) => {
    expect(
      decideRelease({localVersion, publishedVersion: '1.2.3', sourceChanged: false}),
    ).toMatchObject({bump, code: 'SOURCE_CHANGE_REQUIRED', status: 'error'})
  })

  it('should reject a repository version older than npm', () => {
    expect(
      decideRelease({
        localVersion: '1.2.2',
        publishedVersion: '1.2.3',
        sourceChanged: true,
      }),
    ).toMatchObject({code: 'VERSION_BEHIND_NPM', status: 'error'})
  })

  it('should publish an initial minor prerelease when package source changed', () => {
    expect(
      decideRelease({
        localVersion: '1.3.0-beta.1',
        publishedVersion: '1.2.3',
        sourceChanged: true,
      }),
    ).toMatchObject({bump: 'minor', code: 'RELEASE_READY', npmTag: 'beta', status: 'publish'})
  })

  it('should require a source change for an initial major prerelease', () => {
    expect(
      decideRelease({
        localVersion: '2.0.0-rc.1',
        publishedVersion: '1.2.3',
        sourceChanged: false,
      }),
    ).toMatchObject({bump: 'major', code: 'SOURCE_CHANGE_REQUIRED', status: 'error'})
  })

  it('should publish the next prerelease without another source change', () => {
    expect(
      decideRelease({
        localVersion: '2.0.0-beta.2',
        publishedVersion: '2.0.0-beta.1',
        sourceChanged: false,
      }),
    ).toMatchObject({
      bump: 'prerelease',
      code: 'RELEASE_READY',
      npmTag: 'beta',
      status: 'publish',
    })
  })

  it('should publish a stable promotion with the latest npm tag', () => {
    expect(
      decideRelease({
        localVersion: '2.0.0',
        publishedVersion: '2.0.0-rc.2',
        sourceChanged: false,
      }),
    ).toMatchObject({
      bump: 'prerelease',
      code: 'RELEASE_READY',
      npmTag: 'latest',
      status: 'publish',
    })
  })

  it('should reject an older prerelease', () => {
    expect(
      decideRelease({
        localVersion: '2.0.0-beta.1',
        publishedVersion: '2.0.0-beta.2',
        sourceChanged: true,
      }),
    ).toMatchObject({code: 'VERSION_BEHIND_NPM', status: 'error'})
  })

  it('should use a protected fallback tag for a numeric prerelease identifier', () => {
    expect(
      decideRelease({
        localVersion: '1.2.4-1',
        publishedVersion: '1.2.3',
        sourceChanged: false,
      }),
    ).toMatchObject({npmTag: 'prerelease', status: 'publish'})
  })

  it('should prevent a prerelease identifier from selecting the latest npm tag', () => {
    expect(
      decideRelease({
        localVersion: '1.2.4-latest.1',
        publishedVersion: '1.2.3',
        sourceChanged: false,
      }),
    ).toMatchObject({npmTag: 'prerelease', status: 'publish'})
  })

  it.each(['v2', 'x'])(
    'should use a protected fallback tag when %s can be interpreted as a SemVer range',
    (identifier) => {
      expect(
        decideRelease({
          localVersion: `1.2.4-${identifier}.1`,
          publishedVersion: '1.2.3',
          sourceChanged: false,
        }),
      ).toMatchObject({npmTag: 'prerelease', status: 'publish'})
    },
  )

  it('should compare numeric prerelease identifiers below text identifiers', () => {
    expect(findHighestVersion(['1.2.4-alpha', '1.2.4-1'])).toBe('1.2.4-alpha')
  })

  it('should preserve text prerelease precedence when npm returns numeric first', () => {
    expect(findHighestVersion(['1.2.4-1', '1.2.4-alpha'])).toBe('1.2.4-alpha')
  })

  it('should compare text prerelease identifiers in ASCII order', () => {
    expect(findHighestVersion(['1.2.4-alpha', '1.2.4-beta'])).toBe('1.2.4-beta')
  })

  it('should preserve text prerelease precedence when npm returns the higher value first', () => {
    expect(findHighestVersion(['1.2.4-beta', '1.2.4-alpha'])).toBe('1.2.4-beta')
  })

  it('should compare additional prerelease identifiers after an equal prefix', () => {
    expect(findHighestVersion(['1.2.4-beta', '1.2.4-beta.1'])).toBe('1.2.4-beta.1')
  })

  it('should preserve longer prerelease precedence when npm returns it first', () => {
    expect(findHighestVersion(['1.2.4-beta.1', '1.2.4-beta'])).toBe('1.2.4-beta.1')
  })

  it('should skip an identical prerelease version', () => {
    expect(
      decideRelease({
        localVersion: '1.2.4-beta.1',
        publishedVersion: '1.2.4-beta.1',
        sourceChanged: true,
      }),
    ).toMatchObject({code: 'VERSION_UNCHANGED', status: 'skip'})
  })

  it('should reject a version that is not major.minor.patch SemVer', () => {
    expect(
      decideRelease({localVersion: '1.2', publishedVersion: '1.1.0', sourceChanged: true}),
    ).toMatchObject({code: 'INVALID_VERSION', status: 'error'})
  })

  it('should reject malformed prerelease versions', () => {
    expect(
      decideRelease({
        localVersion: '1.3.0-beta.01',
        publishedVersion: '1.2.3',
        sourceChanged: true,
      }),
    ).toMatchObject({code: 'INVALID_VERSION', status: 'error'})
  })

  it('should require a manual first publication', () => {
    expect(
      decideRelease({localVersion: '1.0.0', publishedVersion: null, sourceChanged: true}),
    ).toMatchObject({code: 'FIRST_PUBLISH_REQUIRED', status: 'skip'})
  })
})

describe('findHighestVersion', () => {
  it('should select the highest stable or prerelease npm version', () => {
    expect(findHighestVersion(['1.9.0', '2.0.0-beta.2', '2.0.0-beta.10'])).toBe('2.0.0-beta.10')
  })

  it('should rank a stable version above prereleases with the same core version', () => {
    expect(findHighestVersion(['2.0.0-rc.2', '2.0.0', '2.0.0-beta.10'])).toBe('2.0.0')
  })

  it('should reject an unsupported version returned by npm', () => {
    expect(() => findHighestVersion(['1.0.0', 'invalid'])).toThrow(
      'npm returned an unsupported version: invalid',
    )
  })
})
