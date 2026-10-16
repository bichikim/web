import {describe, expect, test} from 'vitest'

import {
  getMotionFramesPerSecond,
  PUPPET_DOCUMENT_FORMAT,
  PUPPET_DOCUMENT_VERSION,
  type PuppetDocument,
  type PuppetLayout,
} from '../../document'
import {parseDocumentValue} from '../../parse-document'
import {fitDocument} from '../layout-player-root'

const createDocument = (extra: Partial<PuppetDocument> = {}): PuppetDocument => ({
  format: PUPPET_DOCUMENT_FORMAT,
  motions: [{duration: 1, id: 'm', tracks: []}],
  parts: [],
  version: PUPPET_DOCUMENT_VERSION,
  viewport: {height: 200, width: 100},
  ...extra,
})

const screen = {height: 400, width: 400}
const fit = (layout?: PuppetLayout, framing?: 'layout' | 'viewport', padding = 0) =>
  fitDocument({
    document: createDocument({layout}),
    framing,
    screen,
    viewportPadding: padding,
  })

describe('document layout', () => {
  test('should fit the whole viewport, centered, without a layout', () => {
    expect(fit()).toEqual({offset: {x: 100, y: 0}, scale: 2})
    expect(fit(undefined, undefined, 0.5)).toEqual({offset: {x: 150, y: 100}, scale: 1})
  })

  test('should fit the layout rectangle and place it by its alignment', () => {
    const face = {height: 50, width: 100, x: 0, y: 20}
    // 100×50 fits 400 wide at 4×; the 200 spare pixels of height split by the alignment.
    expect(fit(face)).toEqual({offset: {x: 0, y: 100 - 80}, scale: 4})
    expect(fit({...face, align: [0.5, 0]})).toEqual({offset: {x: 0, y: -80}, scale: 4})
    expect(fit({...face, align: [0.5, 1]})).toEqual({offset: {x: 0, y: 200 - 80}, scale: 4})
    // Padding keeps a margin around the rectangle at either alignment.
    expect(fit({...face, align: [0, 0]}, undefined, 0.25)).toEqual({
      offset: {x: 0 + 25 * (400 / 150), y: (12.5 - 20) * (400 / 150)},
      scale: 400 / 150,
    })
    expect(fit(face, 'viewport')).toEqual(fit())
  })

  test('should validate layouts and motion frame rates', () => {
    const valid = (extra: Partial<PuppetDocument>) => parseDocumentValue(createDocument(extra)).ok
    expect(valid({layout: {align: [0, 1], height: 10, width: 10, x: -5, y: 0}})).toBe(true)
    expect(valid({layout: {height: 0, width: 10, x: 0, y: 0}})).toBe(false)
    expect(valid({layout: {align: [0, 1.5], height: 10, width: 10, x: 0, y: 0}})).toBe(false)
    const motion = (framesPerSecond: number) => ({
      motions: [{duration: 1, framesPerSecond, id: 'm', tracks: []}],
    })
    expect(valid(motion(30))).toBe(true)
    expect(valid(motion(29.97))).toBe(false)
    expect(valid(motion(0))).toBe(false)
    const document = createDocument({framesPerSecond: 12, ...motion(60)})
    expect(getMotionFramesPerSecond(document, document.motions[0])).toBe(60)
    expect(getMotionFramesPerSecond(document)).toBe(12)
  })
})
