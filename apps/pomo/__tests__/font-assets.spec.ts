import {readFileSync, statSync} from 'node:fs'
import {dirname, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

import {describe, expect, it} from 'vitest'

const appDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const publicDirectory = resolve(appDirectory, 'public')
const resolvePublicAsset = (assetPath: string) => resolve(publicDirectory, `.${assetPath}`)
const fontDirectory = resolvePublicAsset(import.meta.env.VITE_POMO_PRETENDARD_BASE_PATH)
const fontStylePath = resolvePublicAsset(import.meta.env.VITE_POMO_PRETENDARD_STYLESHEET_PATH)

describe('Pretendard font assets', () => {
  it('should use local dynamic subsets with fallback swapping', () => {
    const fontStyle = readFileSync(fontStylePath, 'utf8')
    const fontFaces = fontStyle.match(/@font-face\s*\{[^}]+\}/gu) ?? []
    const fontSources = [...fontStyle.matchAll(/src:\s*url\(([^)]+)\)/gu)].map((match) => match[1])

    expect(fontFaces).toHaveLength(92)
    expect(fontSources).toHaveLength(fontFaces.length)
    expect(new Set(fontSources).size).toBe(fontFaces.length)
    expect(fontStyle).not.toMatch(/src:\s*url\((?:https?:)?\/\//u)

    for (const fontFace of fontFaces) {
      expect(fontFace).toContain("font-family: 'Pretendard Variable';")
      expect(fontFace).toContain('font-display: swap;')
      expect(fontFace).toContain('unicode-range:')
    }

    for (const fontSource of fontSources) {
      expect(statSync(resolve(fontDirectory, fontSource)).size).toBeGreaterThan(0)
    }
  })
})
