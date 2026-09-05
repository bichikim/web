/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {runImageGeneration} from 'src/features/image-generation/client'
import Workspace from '../Workspace'

vi.mock('src/features/image-generation/client', () => ({runImageGeneration: vi.fn()}))
beforeEach(() => {
  vi.stubGlobal('navigator', {
    gpu: {requestAdapter: vi.fn().mockResolvedValue({features: new Set(['shader-f16'])})},
  })
  vi.mocked(runImageGeneration).mockImplementation(() => new Promise(() => {}))
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

it('should render indeterminate progress on generation start and keep the stop action available', async () => {
  render(() => <Workspace />)
  fireEvent.input(screen.getByLabelText('어떤 장면을 만들까요?'), {
    target: {value: '춤추는 햄버거'},
  })
  const generate = screen.getByRole('button', {name: '이미지 생성'}) as HTMLButtonElement
  await vi.waitFor(() => expect(generate.disabled).toBe(false))
  fireEvent.click(generate)
  expect(screen.getByRole('progressbar').hasAttribute('value')).toBe(false)
  const options = vi.mocked(runImageGeneration).mock.calls[0]?.[0]
  options?.onUpdate({label: 'Downloading', percentage: 25, type: 'progress'})
  expect(screen.getByRole('progressbar').getAttribute('value')).toBe('25')
  fireEvent.click(screen.getByRole('button', {name: '중지'}))
  expect(options?.signal.aborted).toBe(true)
  expect(screen.queryByRole('progressbar')).toBe(null)
})
