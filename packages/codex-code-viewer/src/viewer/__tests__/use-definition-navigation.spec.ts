import {createRoot} from 'solid-js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import type {CallToolResult} from '@modelcontextprotocol/sdk/types.js'
import type {CodeToken, ViewerSession} from '../../shared/contracts'
import type {ViewerPort} from '../types'
import {useDefinitionNavigation} from '../use-definition-navigation'
import {useLatestRequest} from '../use-latest-request'

const token: CodeToken = {kind: 'identifier', navigation: 'definition', offset: 0, text: 'Report'}
const session: ViewerSession = {
  document: {
    lines: [[]],
    location: {column: 1, line: 1, path: 'main.rb'},
    revision: 'initial',
    source: 'Report',
  },
  session: 'session',
  workspace: '/project',
}
const location = {column: 3, line: 2, path: 'report.rb'}

describe('useDefinitionNavigation', () => {
  let dispose: () => void
  let port: ViewerPort
  const open = vi.fn(async () => {})
  const report = vi.fn()
  beforeEach(() => {
    port = {
      call: vi.fn(async () => ({content: [], structuredContent: {locations: []}})),
      context: vi.fn(async () => {}),
      start: vi.fn(async () => () => {}),
    }
  })
  afterEach(() => {
    dispose()
    vi.clearAllMocks()
  })
  const mount = () =>
    createRoot((cleanup) => {
      dispose = cleanup
      const request = useLatestRequest(report)
      const navigation = useDefinitionNavigation({
        onOpen: open,
        port,
        run: request.run,
        session: () => session,
      })
      return {cancel: request.cancel, navigation}
    })
  it('should open a unique definition without producing feedback', async () => {
    vi.mocked(port.call).mockResolvedValueOnce({
      content: [],
      structuredContent: {locations: [location]},
    })
    const {navigation} = mount()
    await navigation.follow(token)
    expect(open).toHaveBeenCalledWith(location)
    expect(navigation.feedback()).toBeNull()
    expect(navigation.choices()).toEqual([])
  })
  it('should expose a fresh missing result for repeated unresolved definitions', async () => {
    const {navigation} = mount()
    await navigation.follow(token)
    const previous = navigation.feedback()
    expect(previous).toEqual({kind: 'missing'})
    await navigation.follow(token)
    expect(navigation.feedback()).toEqual({kind: 'missing'})
    expect(navigation.feedback()).not.toBe(previous)
    expect(open).not.toHaveBeenCalled()
  })
  it('should dismiss selection feedback independently from definition choices', async () => {
    const locations = [location, {...location, path: 'other.rb'}]
    vi.mocked(port.call).mockResolvedValueOnce({content: [], structuredContent: {locations}})
    const {navigation} = mount()
    await navigation.follow(token)
    expect(navigation.feedback()).toEqual({kind: 'choose'})
    navigation.dismissFeedback()
    expect(navigation.feedback()).toBeNull()
    expect(navigation.choices()).toEqual(locations)
    navigation.reset()
    expect(navigation.choices()).toEqual([])
  })
  it('should ignore feedback from discarded definition requests', async () => {
    const pending = Promise.withResolvers<CallToolResult>()
    vi.mocked(port.call).mockReturnValueOnce(pending.promise)
    const {cancel, navigation} = mount()
    const following = navigation.follow(token)
    cancel()
    pending.resolve({content: [], structuredContent: {locations: []}})
    await following
    expect(navigation.feedback()).toBeNull()
    expect(navigation.choices()).toEqual([])
    expect(open).not.toHaveBeenCalled()
  })
})
