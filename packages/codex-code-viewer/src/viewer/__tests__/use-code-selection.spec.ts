import {createRoot} from 'solid-js'
import {describe, expect, it, vi} from 'vitest'
import {useCodeSelection} from '../use-code-selection'

describe('useCodeSelection', () => {
  it('should retain positions and sharing in a viewport document without eager line tokens', async () => {
    const document = {
      lineCount: 4,
      lines: [],
      location: {column: 1, line: 3, path: 'large.ts'},
      readOnly: true,
      revision: 'v1',
      source: 'first\r\nsecond\rthird\n',
    }
    const context = vi.fn()
    const state = createRoot((dispose) => ({
      dispose,
      selection: useCodeSelection({
        onError: vi.fn(),
        onNotice: vi.fn(),
        port: {call: vi.fn(), context, start: vi.fn()},
        session: () => ({document, session: 'session', workspace: '/project'}),
      }),
    }))
    try {
      state.selection.reset(document)
      state.selection.selectText({column: 2, endColumn: 4, endLine: 3, line: 2})
      state.selection.preserve(document)
      expect(state.selection.selection()).toEqual({
        column: 2,
        endColumn: 4,
        endLine: 3,
        line: 2,
        path: 'large.ts',
      })
      await state.selection.share()
      expect(context).toHaveBeenCalledWith({
        column: 2,
        endColumn: 4,
        endLine: 3,
        line: 2,
        path: 'large.ts',
      })
      state.selection.selectLines(3, 4)
      expect(state.selection.selection()).toMatchObject({endLine: 4, line: 3})
    } finally {
      state.dispose()
    }
  })
})

import type {ViewerSession} from '../../shared/contracts'

it('should restore a cursor inside unsaved lines beyond the disk document', () => {
  createRoot((dispose) => {
    const value: ViewerSession = {
      document: {
        lines: [[{kind: 'plain', navigation: null, offset: 0, text: 'disk'}]],
        location: {column: 1, line: 1, path: 'main.ts'},
        revision: 'disk',
        source: 'disk',
      },
      session: 'one',
      workspace: '/project',
    }
    const selection = useCodeSelection({
      onError: vi.fn(),
      onNotice: vi.fn(),
      port: {call: vi.fn(), context: vi.fn(), start: vi.fn()},
      session: () => value,
      source: () => 'disk\nunsaved position\n',
    })
    const saved = {column: 7, endColumn: 7, endLine: 2, line: 2, path: 'main.ts'}
    selection.reset(value.document, saved)
    expect(selection.selection()).toEqual(saved)
    dispose()
  })
})
