/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createRoot, createSignal} from 'solid-js'
import {afterEach, describe, expect, it, vi} from 'vitest'
import type {ViewerSession} from '../../shared/contracts'
import {SCodeDocument} from '../SCodeDocument'
import {useSessionViewState} from '../use-session-view-state'
import {ViewStateContext} from '../view-state/context'

const fixture: ViewerSession = {
  document: {
    lines: [[{kind: 'plain', navigation: null, offset: 0, text: 'hello'}]],
    location: {column: 1, line: 1, path: 'notes.txt'},
    revision: 'one',
    source: 'hello',
  },
  session: 'first',
  workspace: '/project',
}
const mount = () =>
  createRoot((dispose) => {
    const [session, setSession] = createSignal(fixture)
    const state = useSessionViewState({selection: () => null, session})
    return {dispose, session, setSession, state}
  })
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
describe('session view state', () => {
  it('should isolate workspaces, survive new tool sessions and bound recent file state', () => {
    const view = mount()
    view.state.bind()?.update({codeScroll: {left: 30, top: 240}})
    view.setSession({...fixture, session: 'second'})
    expect(view.state.bind()?.read()?.codeScroll).toEqual({left: 30, top: 240})
    view.setSession({...fixture, workspace: '/other'})
    expect(view.state.bind()?.read()).toBeUndefined()
    for (let index = 0; index < 64; index += 1) {
      view.setSession({
        ...fixture,
        document: {
          ...fixture.document,
          location: {...fixture.document.location, path: `${index}.txt`},
        },
      })
      view.state.bind()?.update({original: true})
    }
    view.setSession(fixture)
    expect(view.state.bind()?.read()).toBeUndefined()
    view.dispose()
    const fresh = mount()
    expect(fresh.state.bind()?.read()).toBeUndefined()
    fresh.dispose()
  })

  it('should capture the final viewport when leaving before a scroll event is delivered', async () => {
    const view = mount()
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    })
    const rendered = render(() => (
      <ViewStateContext.Provider value={view.state}>
        <SCodeDocument document={fixture.document} onFollow={() => {}} />
      </ViewStateContext.Provider>
    ))
    await Promise.resolve()
    const code = screen.getByLabelText('소스 코드')
    code.scrollTop = 450
    code.scrollLeft = 70
    rendered.unmount()
    expect(view.state.bind()?.read()?.codeScroll).toEqual({left: 70, top: 450})
    view.dispose()
  })

  it('should restore both scroll axes without jumping to the location and let explicit navigation win', async () => {
    const view = mount()
    const scroll = vi.fn()
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scroll,
    })
    view.state.bind()?.update({codeScroll: {left: 30, top: 240}})
    view.state.restore(fixture, true)
    render(() => (
      <ViewStateContext.Provider value={view.state}>
        <SCodeDocument document={view.session().document} onFollow={() => {}} />
      </ViewStateContext.Provider>
    ))
    await Promise.resolve()
    const code = screen.getByLabelText('소스 코드')
    expect(code.scrollTop).toBe(240)
    expect(code.scrollLeft).toBe(30)
    expect(scroll).not.toHaveBeenCalled()
    code.scrollTop = 400
    fireEvent.scroll(code)
    expect(view.state.bind()?.read()?.codeScroll?.top).toBe(400)
    view.state.restore(fixture, false)
    await Promise.resolve()
    expect(scroll).toHaveBeenCalledOnce()
    view.dispose()
  })
})
