import {describe, expect, it} from 'vitest'

import {getEditorPoint} from '../viewport'

describe('getEditorPoint', () => {
  it('should remove centered letterboxing before mapping into the view box', () => {
    expect(
      getEditorPoint({
        bounds: {height: 600, left: 10, top: 20, width: 1_000},
        clientPoint: {x: 510, y: 320},
        viewBox: {height: 600, width: 800, x: -100, y: -50},
      }),
    ).toEqual({x: 300, y: 250})
  })
})
