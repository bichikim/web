import {expect, it} from 'vitest'
import {defaultPreferences, restorePreferences} from '../pane-preferences'
it('should restore recognized display settings and ignore unsupported choices', () => {
  expect(
    restorePreferences({
      follow: false,
      layout: 'side',
      numbers: false,
      rows: 12,
      tree: false,
      treeWidth: '45%',
      wrap: 'truncate-end',
    }),
  ).toEqual({
    follow: false,
    language: 'ko',
    layout: 'side',
    numbers: false,
    previewLines: 2,
    rows: 12,
    tree: false,
    treeWidth: '45%',
    wrap: 'truncate-end',
  })
  expect(restorePreferences({layout: 'invalid', rows: 200, wrap: 'invalid'})).toEqual(
    defaultPreferences(),
  )
  expect(restorePreferences(null)).toEqual(defaultPreferences())
})
it('should retain dragged sidebar widths within the supported range', () => {
  expect(restorePreferences({treeWidth: '42%'}).treeWidth).toBe('42%')
  expect(restorePreferences({treeWidth: '320px'}).treeWidth).toBe('320px')
  expect(restorePreferences({treeWidth: '199px'}).treeWidth).toBe('288px')
  expect(restorePreferences({treeWidth: '10%'}).treeWidth).toBe('288px')
  expect(restorePreferences({treeWidth: '90%'}).treeWidth).toBe('288px')
  expect(restorePreferences({treeWidth: '42%;color:red'}).treeWidth).toBe('288px')
})
it('should retain automatic layout after reopening a session', () => {
  expect(restorePreferences({layout: 'auto'}).layout).toBe('auto')
})
it('should convert a legacy ratio once and preserve the preferred width through smaller viewports', () => {
  const migrated = restorePreferences({treeWidth: '40%'}, 100)
  expect(migrated.treeWidth).toBe('320px')
  expect(restorePreferences(migrated, 60).treeWidth).toBe('320px')
  expect(restorePreferences(migrated, 160).treeWidth).toBe('320px')
})
it('should restore reference preview line counts within one to five lines', () => {
  expect(restorePreferences({previewLines: 5}).previewLines).toBe(5)
  expect(restorePreferences({previewLines: 0}).previewLines).toBe(2)
  expect(restorePreferences({previewLines: 6}).previewLines).toBe(2)
  expect(restorePreferences({previewLines: '3'}).previewLines).toBe(2)
})

it('should restore supported UI languages and fall back for an unknown stored value', () => {
  expect(restorePreferences({language: 'en'}).language).toBe('en')
  expect(restorePreferences({language: 'fr'}).language).toBe('ko')
})
