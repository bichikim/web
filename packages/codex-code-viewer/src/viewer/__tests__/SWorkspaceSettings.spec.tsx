/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {SWorkspaceSettings} from '../SWorkspaceSettings'
import {LocaleContext} from '../locale/context'

afterEach(cleanup)
it('should show the current path and apply a different folder', async () => {
  const change = vi.fn().mockResolvedValue(true)
  render(() => (
    <LocaleContext.Provider value={() => 'en'}>
      <SWorkspaceSettings active workspace="/old" onChange={change} />
    </LocaleContext.Provider>
  ))
  const input = screen.getByRole<HTMLInputElement>('textbox', {name: 'Workspace'})
  expect(input.value).toBe('/old')
  fireEvent.input(input, {target: {value: '/new'}})
  fireEvent.click(screen.getByRole('button', {name: 'Apply'}))
  expect(change).toHaveBeenCalledExactlyOnceWith('/new')
})
it('should report a rejected change and retain the entered path', async () => {
  render(() => (
    <SWorkspaceSettings
      active
      workspace="/old"
      onChange={async () => {
        throw new Error('존재하는 작업 폴더의 절대 경로를 입력해 주세요.')
      }}
    />
  ))
  fireEvent.input(screen.getByRole('textbox'), {target: {value: '/missing'}})
  fireEvent.click(screen.getByRole('button', {name: '적용'}))
  expect((await screen.findByRole('alert')).textContent).toContain('절대 경로')
  expect(screen.getByRole<HTMLInputElement>('textbox').value).toBe('/missing')
})
