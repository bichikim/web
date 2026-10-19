import {expect, it} from 'vitest'
import {paneGeometry, paneRows} from '../pane-geometry'
import {defaultPreferences} from '../pane-preferences'
it('should share sidebar and source widths between painting and pointer routing', () => {
  expect(paneGeometry(100, defaultPreferences())).toEqual({
    codeColumns: 63,
    side: true,
    treeColumns: 36,
    treeStart: 64,
  })
  expect(paneGeometry(100, {...defaultPreferences(), tree: false})).toEqual({
    codeColumns: 100,
    side: true,
    treeColumns: 0,
    treeStart: 100,
  })
})
it('should retain the preferred pixel width when the outer pane changes size', () => {
  const preferences = {...defaultPreferences(), treeWidth: '320px' as const}
  expect(paneGeometry(100, preferences).treeColumns).toBe(40)
  expect(paneGeometry(160, preferences).treeColumns).toBe(40)
  expect(paneGeometry(60, preferences).treeColumns).toBe(29)
  expect(paneGeometry(160, {...preferences, treeWidth: '200px'}).codeColumns).toBe(134)
})
it('should use the full source width for stacked and narrow automatic layouts', () => {
  expect(paneGeometry(60, {...defaultPreferences(), layout: 'auto'})).toEqual({
    codeColumns: 60,
    side: false,
    treeColumns: 60,
    treeStart: 0,
  })
  expect(paneGeometry(100, {...defaultPreferences(), layout: 'above'})).toEqual({
    codeColumns: 100,
    side: false,
    treeColumns: 100,
    treeStart: 0,
  })
})
it('should reserve native controls and cap expanded rows to the visible viewport', () => {
  expect(paneRows({bodyRows: 46, hasDrafts: true, preferences: defaultPreferences()})).toBe(36)
  expect(
    paneRows({bodyRows: 46, hasDrafts: true, preferences: {...defaultPreferences(), rows: 48}}),
  ).toBe(36)
  expect(
    paneRows({bodyRows: 46, hasDrafts: true, preferences: {...defaultPreferences(), rows: 12}}),
  ).toBe(12)
  expect(
    paneRows({
      bodyRows: 40,
      hasDrafts: false,
      preferences: {...defaultPreferences(), layout: 'above'},
    }),
  ).toBe(16)
})
it('should fill a tall automatic viewport without leaving an arbitrary row cap', () => {
  expect(paneRows({bodyRows: 100, hasDrafts: false, preferences: defaultPreferences()})).toBe(92)
})
