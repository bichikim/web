import {cleanup, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it} from 'vitest'
import {page} from 'vitest/browser'
import {DEFAULT_POFFO_VOICE} from '@winter-love/wallpaper/settings/voice'
import {SPoffoVoiceSettings} from '../../src/components/SPoffoVoiceSettings'
import 'virtual:uno.css'

afterEach(cleanup)

it.each([320, 496])('should align voice controls without overflow at %spx', async (width) => {
  await page.viewport(width + 32, 900)
  const [value, setValue] = createSignal(DEFAULT_POFFO_VOICE)
  render(() => (
    <div class="box-border w-[var(--voice-width)] p-3" style={{'--voice-width': `${width}px`}}>
      <SPoffoVoiceSettings value={value()} onChange={setValue} />
    </div>
  ))
  const region = screen.getByRole('region', {name: '위젯 음성 설정'})
  const service = screen.getByRole('combobox', {name: '음성 서비스'}).getBoundingClientRect()
  for (const label of ['읽어주기 언어', '음성 모델', '목소리']) {
    const bounds = screen.getByRole('combobox', {name: label}).getBoundingClientRect()
    expect(Math.abs(bounds.left - service.left)).toBeLessThan(1)
    expect(Math.abs(bounds.right - service.right)).toBeLessThan(1)
  }
  for (const label of ['읽기 속도', '읽기 음량']) {
    const bounds = screen.getByRole('spinbutton', {name: label}).getBoundingClientRect()
    expect(Math.abs(bounds.left - service.left)).toBeLessThan(2)
  }
  const preview = screen.getByRole('button', {name: '미리듣기'}).getBoundingClientRect()
  expect(Math.abs(preview.right - service.right)).toBeLessThan(1)
  expect(region.scrollWidth).toBeLessThanOrEqual(region.clientWidth)
})
