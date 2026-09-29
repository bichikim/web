/** @vitest-environment jsdom */
import {createGenerator} from 'unocss'
import {describe, expect, it} from 'vitest'

import unoConfig from '../uno.config'

describe('unoConfig', () => {
  it('should size number icons without CSS borders or rotation', async () => {
    const generator = await createGenerator(unoConfig)
    const result = await generator.generate('editor-number-step timeline-row-label', {
      safelist: false,
    })
    const style = document.createElement('style')
    style.textContent = result.css
    const surface = document.createElement('div')
    surface.className = 'puppet-editor'
    surface.innerHTML = `<div class="timeline-row-label">
      <button class="editor-number-step decrement"><span class="puppet-icon"></span></button>
    </div>`
    document.head.append(style)
    document.body.append(surface)
    try {
      const icon = getComputedStyle(surface.querySelector('span')!)
      expect(icon.width).toBe('0.75rem')
      expect(icon.height).toBe('0.75rem')
      expect(icon.transform).not.toContain('rotate')
      expect(icon.borderRightStyle).not.toBe('solid')
    } finally {
      surface.remove()
      style.remove()
    }
  })

  it('should generate Puppet-owned arbitrary property utilities without a global reset', async () => {
    const generator = await createGenerator(unoConfig)
    const result = await generator.generate(
      '[border:0.0625rem_solid_#27302d] [grid-template-columns:4.625rem_minmax(0,_1fr)]',
      {preflights: true, safelist: false},
    )

    expect(result.css).toContain('border:0.0625rem solid #27302d')
    expect(result.css).toContain('grid-template-columns:4.625rem minmax(0, 1fr)')
    expect(result.css).not.toContain('box-sizing:border-box')
  })

  it('should keep influence preset labels from inheriting the deformer field grid', async () => {
    const generator = await createGenerator(unoConfig)
    const result = await generator.generate(
      'deformer-properties influence-inline-row influence-presets influence-preset-option editor-button',
      {safelist: false},
    )
    const style = document.createElement('style')
    style.textContent = result.css
    const surface = document.createElement('main')
    surface.className = 'puppet-editor'
    surface.innerHTML = `<fieldset class="deformer-properties"><div class="influence-inline-row">
      <fieldset class="influence-presets" data-compact="true"><legend>곡선 모양</legend>
        <label class="influence-preset-option"><input type="radio"><span class="editor-button">약하게</span></label>
        <label class="influence-preset-option"><input type="radio"><span class="editor-button">강하게</span></label>
        <label class="influence-preset-option"><input type="radio"><span class="editor-button">중간에서 최대</span></label>
      </fieldset></div></fieldset>`
    document.head.append(style)
    document.body.append(surface)
    try {
      const presetGroup = surface.querySelector('fieldset fieldset')!
      const labels = presetGroup.querySelectorAll('label')
      expect(getComputedStyle(presetGroup).display).toBe('flex')
      expect([...labels].map((label) => getComputedStyle(label).display)).toEqual([
        'flex',
        'flex',
        'flex',
      ])
    } finally {
      surface.remove()
      style.remove()
    }
  })
})

it('should style toolbar menu buttons and separators outside the editor root', async () => {
  const generator = await createGenerator(unoConfig)
  const result = await generator.generate('toolbar-menu-content', {safelist: false})
  const style = document.createElement('style')
  style.textContent = result.css
  const menu = document.createElement('div')
  menu.className = 'toolbar-menu-content'
  menu.innerHTML = `<button class="file-menu-action"><span>가져오기</span><small>기존 문서에 추가</small></button>
    <hr><button disabled>Redo</button>`
  document.head.append(style)
  document.body.append(menu)
  try {
    const button = getComputedStyle(menu.querySelector('button')!)
    expect(button.backgroundColor).toBe('rgba(0, 0, 0, 0)')
    expect(button.fontSize).toBe('0.75rem')
    expect(button.textAlign).toBe('left')
    expect(button.display).toBe('flex')
    expect(button.flexDirection).toBe('column')
    expect(getComputedStyle(menu.querySelector('button:disabled')!).opacity).toBe('0.42')
    expect(getComputedStyle(menu.querySelector('hr')!).width).toBe('100%')
  } finally {
    menu.remove()
    style.remove()
  }
})

it('should keep spatial mesh dialog dividers on their intended edge', async () => {
  const generator = await createGenerator(unoConfig)
  const result = await generator.generate(
    'spatial-mesh-dialog-content spatial-mesh-tool-rail spatial-mesh-history-controls ' +
      'spatial-mesh-operations spatial-mesh-panel-heading spatial-mesh-property-panel ' +
      'spatial-mesh-combine-controls spatial-mesh-object-list',
    {safelist: false},
  )
  const style = document.createElement('style')
  style.textContent = result.css
  const dialog = document.createElement('div')
  dialog.className = 'spatial-mesh-dialog-content'
  dialog.innerHTML = `<form><header><div class="spatial-mesh-history-controls"></div></header>
    <div class="spatial-mesh-tool-rail"></div><aside class="spatial-mesh-operations">
    <div class="spatial-mesh-panel-heading"></div><ul class="spatial-mesh-object-list"><li></li></ul>
    <div class="spatial-mesh-combine-controls"></div>
    <section class="spatial-mesh-property-panel"></section></aside><footer></footer></form>`
  document.head.append(style)
  document.body.append(dialog)
  try {
    const borderWidths = (selector: string) => {
      const element = dialog.querySelector(selector)!
      const computed = getComputedStyle(element)
      return [
        computed.borderTopWidth,
        computed.borderRightWidth,
        computed.borderBottomWidth,
        computed.borderLeftWidth,
      ]
    }
    expect(borderWidths('header')).toEqual(['0px', '0px', '1px', '0px'])
    expect(borderWidths('footer')).toEqual(['1px', '0px', '0px', '0px'])
    expect(borderWidths('.spatial-mesh-history-controls')).toEqual(['0px', '0px', '0px', '1px'])
    expect(borderWidths('.spatial-mesh-tool-rail')).toEqual(['0px', '1px', '0px', '0px'])
    expect(borderWidths('.spatial-mesh-operations')).toEqual(['0px', '0px', '0px', '1px'])
    expect(borderWidths('.spatial-mesh-panel-heading')).toEqual(['0px', '0px', '1px', '0px'])
    expect(borderWidths('.spatial-mesh-object-list li')).toEqual(['0px', '0px', '0px', '2px'])
    expect(borderWidths('.spatial-mesh-combine-controls')).toEqual(['1px', '0px', '0px', '0px'])
    expect(borderWidths('.spatial-mesh-property-panel')).toEqual(['1px', '0px', '0px', '0px'])
  } finally {
    dialog.remove()
    style.remove()
  }
})
