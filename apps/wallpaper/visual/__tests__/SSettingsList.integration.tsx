import {cleanup, render, screen, within} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, test} from 'vitest'
import {page, userEvent} from 'vitest/browser'
import {SSettingsList} from '../../src/components/SSettingsList'
import 'virtual:uno.css'

afterEach(cleanup)

test.each([320, 496])(
  'should show complete Korean names and descriptions at %spx',
  async (width) => {
    const options = [
      {description: '관절 5개', label: '왼쪽 묶은 머리', value: 'left'},
      {
        description: '관절 5개 · 사용하지 않음',
        label: '오른쪽으로 묶은 긴 머리카락 끝부분 연결',
        value: 'right',
      },
      {
        description: '관절 3개',
        label: 'TouchHairPonytailRotationSegment0123456789',
        value: 'parameter',
      },
      ...['왼팔', '오른팔', '왼다리', '오른다리'].map((label, index) => ({
        description: '관절 3개',
        label,
        value: `limb-${index}`,
      })),
      {description: '관절 2개', label: '꼬리 끝부분', value: 'tail'},
    ]
    const [selected, setSelected] = createSignal('left')
    const mounted = render(() => (
      <div
        class="box-border w-[var(--list-width)] bg-white p-3 font-sans leading-relaxed"
        style={{'--list-width': `${width}px`}}
      >
        <SSettingsList
          label="관절 연결 목록"
          options={options}
          value={selected()}
          onChange={setSelected}
        />
      </div>
    ))
    for (const option of options) {
      const button = screen.getByRole('button', {name: `${option.label} 편집`})
      for (const text of [option.label, option.description]) {
        const element = within(button).getByText(text, {exact: true})
        expect(element.scrollWidth, text).toBeLessThanOrEqual(element.clientWidth)
        expect(element.scrollHeight, text).toBeLessThanOrEqual(
          Math.ceil(element.getBoundingClientRect().height),
        )
        const range = document.createRange()
        range.selectNodeContents(element)
        const bounds = element.getBoundingClientRect()
        for (const line of range.getClientRects()) {
          expect(line.left).toBeGreaterThanOrEqual(bounds.left - 1)
          expect(line.right).toBeLessThanOrEqual(bounds.right + 1)
          expect(line.top).toBeGreaterThanOrEqual(bounds.top - 1)
          expect(line.bottom).toBeLessThanOrEqual(bounds.bottom + 1)
        }
        expect(bounds.bottom).toBeLessThan(button.getBoundingClientRect().bottom)
      }
    }
    const last = screen.getByRole('button', {name: '꼬리 끝부분 편집'})
    last.focus()
    await userEvent.keyboard('{Space}')
    expect(selected()).toBe('tail')
    expect(last.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      last.parentElement!.getBoundingClientRect().bottom,
    )
    expect(mounted.container.firstElementChild!.scrollWidth).toBeLessThanOrEqual(width)
    await page
      .getByRole('region', {name: '관절 연결 목록'})
      .screenshot({path: `__screenshots__/settings-list-labels-${width}.png`})
  },
)
