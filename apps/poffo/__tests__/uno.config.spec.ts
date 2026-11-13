/** @vitest-environment jsdom */
import {createGenerator} from 'unocss'
import {expect, test} from 'vitest'
import unoConfig from '../uno.config'

test('should style toolbar menu buttons and separators outside the editor root', async () => {
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
