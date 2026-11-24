import {cleanup, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it} from 'vitest'
import {page, userEvent} from 'vitest/browser'
import {SSettingsEditor} from '../../src/components/SSettingsEditor'
import 'virtual:uno.css'

afterEach(cleanup)
it.each([320, 496])(
  'should restore list search, page scroll and focus after switching details at %spx',
  async (width) => {
    const options = Array.from({length: 30}, (_, index) => ({
      label: `항목 ${index}`,
      value: `${index}`,
    }))
    render(() => (
      <section
        aria-label="설정 화면"
        class="box-border h-96 w-[var(--editor-width)] overflow-y-auto bg-white p-3"
        style={{'--editor-width': `${width}px`}}
      >
        <div aria-hidden="true" class="h-40" />
        <SSettingsEditor label="행동 연결" options={options}>
          {(id) => (
            <div class="h-160">
              <input aria-label="상세 내용" value={id} readOnly />
            </div>
          )}
        </SSettingsEditor>
        <div aria-hidden="true" class="h-64" />
      </section>
    ))
    const outer = screen.getByRole('region', {name: '설정 화면'})
    const search = screen.getByRole('searchbox', {name: '행동 연결 목록 검색'})
    await userEvent.fill(search, '항목 1')
    const list = screen.getByRole('region', {name: '행동 연결 목록'})
    const scroll = list.querySelector('div')!
    scroll.scrollTop = 80
    outer.scrollTop = 160
    const origin = screen.getByRole('button', {name: '항목 15 편집'})
    origin.scrollIntoView({block: 'nearest'})
    const position = {list: scroll.scrollTop, outer: outer.scrollTop}
    expect(position.outer).toBeGreaterThan(0)
    expect(position.list).toBe(0)
    await userEvent.click(origin)
    expect(list.getClientRects()).toHaveLength(0)
    expect(screen.queryByRole('region', {name: '행동 연결 목록'})).toBeNull()
    expect(screen.getByRole('textbox', {name: '상세 내용'})).toHaveValue('15')
    await userEvent.click(screen.getByRole('combobox', {name: '행동 연결 선택'}))
    await userEvent.click(screen.getByRole('option', {exact: true, name: '항목 27'}))
    expect(screen.getByRole('textbox', {name: '상세 내용'})).toHaveValue('27')
    await userEvent.click(screen.getByRole('button', {name: '행동 연결 목록으로'}))
    expect(screen.getByRole('searchbox', {name: '행동 연결 목록 검색'})).toBe(search)
    expect(search).toHaveValue('항목 1')
    await expect.poll(() => ({list: scroll.scrollTop, outer: outer.scrollTop})).toEqual(position)
    expect(origin).toHaveFocus()
    expect(outer.scrollWidth).toBeLessThanOrEqual(outer.clientWidth)
    await page
      .getByRole('region', {name: '설정 화면'})
      .screenshot({path: `__screenshots__/settings-navigation-${width}.png`})
  },
)
