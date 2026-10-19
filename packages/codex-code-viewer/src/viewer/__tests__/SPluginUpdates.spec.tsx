/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {SPluginUpdates} from '../SPluginUpdates'
import {LocaleContext} from '../locale/context'
import type {ViewerPort} from '../types'

afterEach(cleanup)
const available = {current: '0.6.0', latest: '0.7.0', status: 'available', target: 'codex'}
describe('SPluginUpdates', () => {
  it('should explain that another viewer is updating without offering a competing terminal command', async () => {
    const call = vi
      .fn<ViewerPort['call']>()
      .mockResolvedValueOnce({content: [], structuredContent: available})
      .mockResolvedValueOnce({
        content: [],
        isError: true,
        structuredContent: {code: 'update-in-progress'},
      })
    render(() => (
      <LocaleContext.Provider value={() => 'en'}>
        <SPluginUpdates active port={{call}} />
      </LocaleContext.Provider>
    ))
    fireEvent.click(await screen.findByRole('button', {name: 'Update'}))
    await screen.findByText('Another window is installing an update. Check again when it finishes.')
    expect(screen.queryByText(/npx @winter-love/u)).toBeNull()
  })
  it('should wait for settings to open and show the current and available versions', async () => {
    const call = vi
      .fn<ViewerPort['call']>()
      .mockResolvedValue({content: [], structuredContent: available})
    const [active, setActive] = createSignal(false)
    render(() => (
      <LocaleContext.Provider value={() => 'en'}>
        <SPluginUpdates active={active()} port={{call}} />
      </LocaleContext.Provider>
    ))
    expect(call).not.toHaveBeenCalled()
    setActive(true)
    await screen.findByRole('button', {name: 'Update'})
    expect(screen.getByText('Current version 0.6.0')).toBeTruthy()
    expect(screen.getByRole('status').textContent).toBe('New version 0.7.0')
  })
  it('should install on click, disable concurrent actions and explain the required restart', async () => {
    let finish: (value: Awaited<ReturnType<ViewerPort['call']>>) => void = () => {}
    const call = vi
      .fn<ViewerPort['call']>()
      .mockResolvedValueOnce({content: [], structuredContent: available})
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve
          }),
      )
    render(() => (
      <LocaleContext.Provider value={() => 'en'}>
        <SPluginUpdates active port={{call}} />
      </LocaleContext.Provider>
    ))
    const update = await screen.findByRole<HTMLButtonElement>('button', {
      name: 'Update',
    })
    fireEvent.click(update)
    expect(update.disabled).toBe(true)
    expect(
      screen.getByRole<HTMLButtonElement>('button', {name: 'Check for updates'}).disabled,
    ).toBe(true)
    expect(screen.getByRole('status').textContent).toBe('Installing update…')
    finish({content: [], structuredContent: {...available, status: 'installed'}})
    await screen.findByText('Installed. Quit Codex completely and reopen it.')
    expect(screen.queryByRole('button', {name: 'Update'})).toBeNull()
  })
  it('should show an actionable retry and command when installation fails', async () => {
    const call = vi
      .fn<ViewerPort['call']>()
      .mockResolvedValueOnce({content: [], structuredContent: {...available, target: 'claude'}})
      .mockResolvedValueOnce({content: [], isError: true})
    render(() => (
      <LocaleContext.Provider value={() => 'en'}>
        <SPluginUpdates active port={{call}} />
      </LocaleContext.Provider>
    ))
    fireEvent.click(await screen.findByRole('button', {name: 'Update'}))
    await screen.findByText('Installation failed. Retry or run in a terminal.')
    expect(
      screen.getByText('npx @winter-love/codex-code-viewer@0.7.0 install --target claude'),
    ).toBeTruthy()
    expect(screen.getByRole<HTMLButtonElement>('button', {name: 'Update'}).disabled).toBe(false)
  })
  it('should show the up-to-date state without an install action', async () => {
    const call = vi
      .fn<ViewerPort['call']>()
      .mockResolvedValue({content: [], structuredContent: {...available, status: 'current'}})
    render(() => (
      <LocaleContext.Provider value={() => 'en'}>
        <SPluginUpdates active port={{call}} />
      </LocaleContext.Provider>
    ))
    await screen.findByText('You’re up to date.')
    expect(screen.queryByRole('button', {name: 'Update'})).toBeNull()
  })
})
