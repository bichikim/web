import {type Accessor, createRoot} from 'solid-js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import type {CallToolResult} from '@modelcontextprotocol/sdk/types.js'
import type {CodeSource, CodeToken, ViewerSession} from '../../shared/contracts'
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
interface MountOptions {
  readonly session?: Accessor<ViewerSession | null>
  readonly sources?: Accessor<readonly CodeSource[]>
  readonly revision?: Accessor<string>
}

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
  const mount = (options: MountOptions = {}) =>
    createRoot((cleanup) => {
      dispose = cleanup
      const request = useLatestRequest(report)
      const navigation = useDefinitionNavigation({
        onOpen: open,
        port,
        revision: options.revision,
        run: request.run,
        session: options.session ?? (() => session),
        sources: options.sources,
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
  it('should retain reference source previews from the navigation response', async () => {
    const reference = {...location, preview: 'greet("draft")'}
    vi.mocked(port.call).mockResolvedValueOnce({
      content: [],
      structuredContent: {kind: 'references', locations: [reference]},
    })
    const {navigation} = mount()
    await navigation.follow(token)
    expect(navigation.references()?.locations).toEqual([reference])
  })
  it.each([
    {locations: []},
    {locations: [location]},
    {locations: [location, {...location, path: 'other.rb'}]},
  ])('should show references in a menu regardless of count', async ({locations}) => {
    vi.mocked(port.call).mockResolvedValueOnce({
      content: [],
      structuredContent: {kind: 'references', locations},
    })
    const {navigation} = mount()
    await navigation.follow(token, {x: 40, y: 80})
    expect(open).not.toHaveBeenCalled()
    expect(navigation.references()).toEqual({label: 'Report', locations, point: {x: 40, y: 80}})
    expect(navigation.feedback()).toBeNull()
    navigation.reset()
    expect(navigation.references()).toBeNull()
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
  it.each([
    {kind: 'definition', locations: [location]},
    {kind: 'definition', locations: [location, {...location, path: 'other.rb'}]},
    {kind: 'definition', locations: []},
    {kind: 'references', locations: [location]},
  ])(
    'should ignore stale $kind results with $locations after an unsaved source changes',
    async (response) => {
      const pending = Promise.withResolvers<CallToolResult>()
      vi.mocked(port.call).mockReturnValueOnce(pending.promise)
      let source = 'Report'
      const {navigation} = mount({sources: () => [{path: 'main.rb', source}]})
      const following = navigation.follow(token)
      source = '\nReport'
      pending.resolve({content: [], structuredContent: response})
      await following
      expect(navigation.references()).toBeNull()
      expect(navigation.choices()).toEqual([])
      expect(navigation.feedback()).toBeNull()
      expect(open).not.toHaveBeenCalled()
    },
  )
  it.each([
    {operation: 'changed', sources: [{path: 'other.rb', source: '\nReport'}]},
    {
      operation: 'added',
      sources: [
        {path: 'other.rb', source: 'Report'},
        {path: 'report.rb', source: 'Report'},
      ],
    },
    {operation: 'removed', sources: []},
  ])('should ignore results when another file draft is $operation', async (entry) => {
    const pending = Promise.withResolvers<CallToolResult>()
    vi.mocked(port.call).mockReturnValueOnce(pending.promise)
    let sources: readonly CodeSource[] = [{path: 'other.rb', source: 'Report'}]
    const {navigation} = mount({sources: () => sources})
    const following = navigation.follow(token)
    sources = entry.sources
    pending.resolve({content: [], structuredContent: {kind: 'references', locations: [location]}})
    await following
    expect(navigation.references()).toBeNull()
  })
  it('should retain valid results when draft accessors return equivalent fresh arrays', async () => {
    let sources = [
      {path: 'main.rb', source: 'Report'},
      {path: 'report.rb', source: 'class Report; end'},
    ]
    const pending = Promise.withResolvers<CallToolResult>()
    vi.mocked(port.call).mockReturnValueOnce(pending.promise)
    const {navigation} = mount({sources: () => sources.map((entry) => ({...entry}))})
    const following = navigation.follow(token)
    sources = sources.toReversed()
    pending.resolve({content: [], structuredContent: {kind: 'references', locations: [location]}})
    await following
    expect(navigation.references()?.locations).toEqual([location])
  })
  it.each(['revision', 'path', 'session', 'closed'])(
    'should ignore results when the active document %s changes',
    async (operation) => {
      const pending = Promise.withResolvers<CallToolResult>()
      vi.mocked(port.call).mockReturnValueOnce(pending.promise)
      let current: ViewerSession | null = session
      const {navigation} = mount({session: () => current})
      const following = navigation.follow(token)
      current =
        operation === 'closed'
          ? null
          : {
              ...session,
              document: {
                ...session.document,
                location: {
                  ...session.document.location,
                  path: operation === 'path' ? 'other.rb' : 'main.rb',
                },
                revision: operation === 'revision' ? 'changed' : 'initial',
              },
              session: operation === 'session' ? 'other-session' : 'session',
            }
      pending.resolve({content: [], structuredContent: {kind: 'references', locations: [location]}})
      await following
      expect(navigation.references()).toBeNull()
    },
  )
  it('should ignore results when the editor revision changes during analysis', async () => {
    const pending = Promise.withResolvers<CallToolResult>()
    vi.mocked(port.call).mockReturnValueOnce(pending.promise)
    let revision = 'initial'
    const {navigation} = mount({revision: () => revision})
    const following = navigation.follow(token)
    revision = 'saved'
    pending.resolve({content: [], structuredContent: {kind: 'references', locations: [location]}})
    await following
    expect(navigation.references()).toBeNull()
  })
})
