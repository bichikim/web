import {describe, expect, it} from 'vitest'
import {Checkbox} from '../checkbox'
import {BAR_PERCENT, PERCENT_VAR, POSITION_VAR, SIZE_VAR} from '../css-var'
import {Dialog} from '../dialog'
import {DragButton} from '../drag-button'
import {SScroll} from '../scroll'
import {SSlider} from '../slider'
import {Toast} from '../toast'
import {getId} from '../utils'

describe('component entrypoints', () => {
  it('should expose each composed component family', () => {
    expect(Checkbox).toMatchObject({Body: expect.any(Function), Provider: expect.any(Function)})
    expect(Dialog).toMatchObject({Overlay: expect.any(Function), Provider: expect.any(Function)})
    expect(DragButton).toMatchObject({Body: expect.any(Function), Provider: expect.any(Function)})
    expect(SScroll).toMatchObject({Body: expect.any(Function), Root: expect.any(Function)})
    expect(SSlider).toMatchObject({Bar: expect.any(Function), Root: expect.any(Function)})
    expect(Toast).toMatchObject({Body: expect.any(Function), Provider: expect.any(Function)})
  })

  it('should expose stable style variables and generated identifiers', () => {
    expect([BAR_PERCENT, PERCENT_VAR, POSITION_VAR, SIZE_VAR]).toEqual([
      '--var-bar-percent',
      '--var-percent',
      '--var-position',
      '--var-size',
    ])
    expect(getId('dialog', 'title')).toBe('coong:dialog-title')
  })
})
