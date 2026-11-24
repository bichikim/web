import {cleanup, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {page, userEvent} from 'vitest/browser'
import {SWebsiteAddress} from '../../src/components/SWebsiteAddress'
import 'virtual:uno.css'

afterEach(cleanup)

it.each([320, 560])(
  'should show usable history below the address without clipping at %spx',
  async (width) => {
    const [value, setValue] = createSignal('https://initial.example/')
    const [history, setHistory] = createSignal([
      {url: 'https://bruno-simon.com/', visitedAt: 2},
      {url: 'https://example.org/a-long-website-address-that-must-fit-the-menu', visitedAt: 1},
    ])
    const change = vi.fn((value: string) => {
      setValue(value)
    })
    const remove = vi.fn(async (url: string) => {
      setHistory((items) => items.filter((item) => item.url !== url))
    })
    render(() => (
      <div
        class="box-border grid w-[var(--website-width)] gap-4 bg-white p-4"
        style={{'--website-width': `${width}px`}}
      >
        <button type="button" class="wallpaper-file-button">
          다른 설정
        </button>
        <div class="h-18 overflow-hidden">
          <SWebsiteAddress
            value={value()}
            history={history()}
            onChange={change}
            onRemove={remove}
          />
        </div>
      </div>
    ))
    const input = screen.getByRole('combobox', {name: '웹사이트 주소'})
    await userEvent.click(input)
    const menu = screen.getByRole('dialog', {name: '방문 내역'})
    await expect.poll(() => menu.matches(':popover-open')).toBe(true)
    const address = input.parentElement!.getBoundingClientRect()
    const popup = menu.getBoundingClientRect()
    expect(popup.top).toBeGreaterThanOrEqual(address.bottom)
    expect(popup.top - address.bottom).toBeLessThanOrEqual(8)
    expect(popup.left).toBeCloseTo(address.left, 0)
    expect(popup.width).toBeCloseTo(address.width, 0)
    expect(menu.scrollWidth).toBeLessThanOrEqual(menu.clientWidth)
    const choice = screen.getByRole('button', {name: 'https://bruno-simon.com/'})
    const row = choice.getBoundingClientRect()
    expect(choice.contains(document.elementFromPoint(row.x + 10, row.y + 10))).toBe(true)
    await page
      .getByRole('dialog', {name: '방문 내역'})
      .screenshot({path: `__screenshots__/website-history-${width}.png`})
    await userEvent.fill(input, 'unfinished')
    await userEvent.click(choice)
    expect(change).toHaveBeenCalledExactlyOnceWith('https://bruno-simon.com/')
    expect(input).toHaveFocus()
    expect(screen.queryByRole('dialog')).toBeNull()
    await userEvent.click(screen.getByRole('button', {name: '방문 내역'}))
    await userEvent.keyboard('{ArrowDown}')
    await userEvent.keyboard('{Escape}')
    expect(input).toHaveFocus()
    expect(screen.queryByRole('dialog')).toBeNull()
    await userEvent.click(input)
    await userEvent.click(screen.getByRole('button', {name: 'https://bruno-simon.com/ 내역 삭제'}))
    expect(remove).toHaveBeenCalledExactlyOnceWith('https://bruno-simon.com/')
    expect(change).toHaveBeenCalledOnce()
    expect(screen.getByRole('dialog')).toBeVisible()
    await userEvent.click(screen.getByRole('button', {name: '다른 설정'}))
    expect(screen.queryByRole('dialog')).toBeNull()
  },
)
