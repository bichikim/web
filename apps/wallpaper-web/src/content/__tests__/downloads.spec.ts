import {describe, expect, it} from 'vitest'
import {parseReleaseDownloads} from '../downloads'

const release = {
  build: '12345-1',
  sizes: {
    'macos-arm64': 96_000_000,
    'macos-x64': 97_000_000,
    'windows-x64': 98_000_000,
  },
  version: '0.1.0',
}

describe('Wallpaper release downloads', () => {
  it('links to the three files of the selected build', () => {
    const downloads = parseReleaseDownloads(release)
    expect(downloads?.version).toBe(release.version)
    expect(downloads?.isBeta).toBe(false)
    expect(downloads?.macosNotarized).toBe(false)
    expect(downloads?.files.map(({href}) => href)).toEqual(
      ['macos-arm64.dmg', 'macos-x64.dmg', 'windows-x64.exe'].map(
        (name) => `https://wallpaper-files.pomofi.io/releases/0.1.0/12345-1/${name}`,
      ),
    )
    expect(downloads?.files.map(({megabytes}) => megabytes)).toEqual([96, 97, 98])
  })

  it('identifies a beta release', () => {
    expect(parseReleaseDownloads({...release, channel: 'beta'})?.isBeta).toBe(true)
  })

  it('should recognize macOS notarization in a beta release', () => {
    const downloads = parseReleaseDownloads({...release, channel: 'beta', macosNotarized: true})
    expect(downloads?.isBeta).toBe(true)
    expect(downloads?.macosNotarized).toBe(true)
  })

  it('rejects incomplete or invalid releases', () => {
    expect(parseReleaseDownloads({...release, sizes: {'windows-x64': 1}})).toBeNull()
    expect(parseReleaseDownloads({...release, build: '../../installers'})).toBeNull()
  })
})
