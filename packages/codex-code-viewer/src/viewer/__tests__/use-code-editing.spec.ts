import {createRoot, createSignal} from 'solid-js'
import {afterEach, describe, expect, it, vi} from 'vitest'
import type {CallToolResult} from '@modelcontextprotocol/sdk/types.js'
import type {ViewerSession} from '../../shared/contracts'
import type {ViewerPort} from '../types'
import {useCodeEditing} from '../use-code-editing'

const session = (path = 'main.ts', source = 'original', revision = 'v1'): ViewerSession => ({
  document: {lines: [[]], location: {column: 1, line: 1, path}, revision, source},
  session: 'session',
  workspace: '/project',
})
describe('useCodeEditing', () => {
  let dispose: () => void
  const mount = () =>
    createRoot((cleanup) => {
      dispose = cleanup
      const [current, setCurrent] = createSignal<ViewerSession | null>(session())
      const port: ViewerPort = {
        call: vi.fn(async (_name, args) => ({
          content: [],
          structuredContent: {
            document: session(String(args.path), String(args.source), 'v2').document,
          },
        })),
        context: vi.fn(),
        start: vi.fn(),
      }
      const editing = useCodeEditing({port, session: current})
      return {editing, port, setCurrent}
    })
  afterEach(() => dispose())
  it.each(['original', '', 'edited draft'])(
    'should consider deletion a pending change and recreate %j on save',
    async (source) => {
      const {editing, port} = mount()
      editing.change(source)
      editing.markDeleted(session())
      expect(editing.dirty()).toBe(true)
      expect(editing.pendingFiles()).toEqual(['main.ts'])
      expect(await editing.save()).toBe(true)
      expect(port.call).toHaveBeenCalledWith('code.write', {
        path: 'main.ts',
        revision: null,
        session: 'session',
        source,
      })
      expect(editing.dirty()).toBe(false)
    },
  )
  it('should remove the deleted draft when discarding it', () => {
    const {editing} = mount()
    editing.change('edited draft')
    editing.markDeleted(session())
    editing.discard()
    expect(editing.source()).toBe('original')
    expect(editing.dirty()).toBe(false)
    expect(editing.deleted()).toBe(false)
    expect(editing.pendingFiles()).toEqual([])
  })
  it('should recreate on save when deletion was not yet reported by the watcher', async () => {
    const {editing, port} = mount()
    editing.change('my draft')
    vi.mocked(port.call).mockResolvedValueOnce({
      content: [],
      isError: true,
      structuredContent: {code: 'not-found'},
    })
    expect(await editing.save()).toBe(true)
    expect(port.call).toHaveBeenNthCalledWith(1, 'code.write', {
      path: 'main.ts',
      revision: 'v1',
      session: 'session',
      source: 'my draft',
    })
    expect(port.call).toHaveBeenNthCalledWith(2, 'code.write', {
      path: 'main.ts',
      revision: null,
      session: 'session',
      source: 'my draft',
    })
    expect(editing.dirty()).toBe(false)
  })
  it('should retain a deleted draft if recreation fails', async () => {
    const {editing, port} = mount()
    editing.change('my draft')
    vi.mocked(port.call)
      .mockResolvedValueOnce({content: [], isError: true, structuredContent: {code: 'not-found'}})
      .mockResolvedValueOnce({
        content: [],
        isError: true,
        structuredContent: {code: 'write-failed'},
      })
    expect(await editing.save()).toBe(false)
    expect(editing.deleted()).toBe(true)
    expect(editing.source()).toBe('my draft')
    expect(editing.dirty()).toBe(true)
  })
  it('should offer saving a deleted file before closing even when its text is unchanged', async () => {
    const {editing, port} = mount()
    editing.markDeleted(session())
    const leave = editing.confirmLeave()
    expect(editing.confirming()).toBe(true)
    await editing.resolveLeave('save')
    expect(await leave).toBe(true)
    expect(port.call).toHaveBeenCalledWith('code.write', {
      path: 'main.ts',
      revision: null,
      session: 'session',
      source: 'original',
    })
  })
  it.each(['image.svg', 'document.docx'])(
    'should keep %s read-only without saving a draft',
    async (path) => {
      const {editing, port, setCurrent} = mount()
      setCurrent(session(path))
      expect(editing.editable()).toBe(false)
      editing.change('changed')
      expect(editing.dirty()).toBe(false)
      expect(editing.source()).toBe('original')
      await editing.save()
      expect(port.call).not.toHaveBeenCalled()
    },
  )
  it.each([
    'main.py',
    'main.pyi',
    'main.rb',
    'tasks.rake',
    'example.gemspec',
    'Gemfile',
    'Rakefile',
    'main.rs',
    'config.json',
    'config.jsonc',
    'config.json5',
    'config.toml',
    'config.yaml',
    'config.yml',
    'index.html',
    'index.htm',
    'styles.css',
    'styles.scss',
    'styles.sass',
    'styles.less',
    'Panel.vue',
    'Panel.svelte',
    'Panel.astro',
    'document.xml',
    'settings.ini',
    'settings.conf',
    'settings.cfg',
    'settings.properties',
    'Cargo.lock',
    'notes.txt',
    'LICENSE',
    '.gitignore',
    'readme.md',
    'data.csv',
  ])('should edit and explicitly save %s with revision protection', async (path) => {
    const {editing, port, setCurrent} = mount()
    setCurrent(session(path, 'old text'))
    expect(editing.editable()).toBe(true)
    editing.change('new text')
    expect(editing.dirty()).toBe(true)
    expect(await editing.save()).toBe(true)
    expect(port.call).toHaveBeenCalledWith('code.write', {
      path,
      revision: 'v1',
      session: 'session',
      source: 'new text',
    })
    expect(editing.dirty()).toBe(false)
  })
  it('should supply code and JSON navigation drafts while retaining other text drafts', () => {
    const {editing, setCurrent} = mount()
    editing.change('const codeDraft = 1')
    setCurrent(session('config.json'))
    editing.change('{"draft": true}')
    setCurrent(session('notes.txt'))
    editing.change('text draft')
    setCurrent(session('index.html'))
    editing.change('<script>const htmlDraft = 1</script>')
    expect(editing.sources()).toEqual([
      {path: 'main.ts', source: 'const codeDraft = 1'},
      {path: 'config.json', source: '{"draft": true}'},
    ])
    expect(editing.pendingFiles()).toEqual(['main.ts', 'config.json', 'notes.txt', 'index.html'])
  })
  it.each(['main.py', 'main.rb', 'main.rs'])(
    'should include the unsaved %s source for navigation',
    (path) => {
      const {editing, setCurrent} = mount()
      setCurrent(session(path))
      editing.change('unsaved source')
      expect(editing.sources()).toEqual([{path, source: 'unsaved source'}])
    },
  )
  it('should retain drafts across file moves and refreshes', async () => {
    const {editing, port, setCurrent} = mount()
    editing.change('draft')
    setCurrent(session('helper.ts'))
    expect(editing.source()).toBe('original')
    expect(editing.pendingFiles()).toEqual(['main.ts'])
    setCurrent(session('main.ts', 'external', 'external-revision'))
    expect(editing.source()).toBe('draft')
    expect(editing.revision()).toBe('v1')
    await editing.shareChanges()
    expect(port.context).toHaveBeenCalledWith(
      expect.objectContaining({
        patch: expect.stringContaining('-original\n'),
        revision: 'v1',
      }),
    )
    expect(port.call).not.toHaveBeenCalled()
    expect(editing.dirty()).toBe(true)
  })
  it('should save with the original revision and retain typing during a pending save', async () => {
    const {editing, port} = mount()
    const saved = Promise.withResolvers<CallToolResult>()
    vi.mocked(port.call).mockReturnValueOnce(saved.promise)
    editing.change('first draft')
    const saving = editing.save()
    editing.change('later draft')
    saved.resolve({
      content: [],
      structuredContent: {document: session('main.ts', 'first draft', 'v2').document},
    })
    expect(await saving).toBe(true)
    expect(port.call).toHaveBeenCalledWith('code.write', {
      path: 'main.ts',
      revision: 'v1',
      session: 'session',
      source: 'first draft',
    })
    expect(editing.source()).toBe('later draft')
    expect(editing.dirty()).toBe(true)
    expect(editing.revision()).toBe('v2')
    await editing.shareChanges()
    expect(port.context).toHaveBeenCalledWith(
      expect.objectContaining({
        patch: expect.stringContaining('-first draft\n'),
        revision: 'v2',
      }),
    )
    await editing.save()
    expect(editing.dirty()).toBe(false)
    vi.mocked(port.context).mockClear()
    await editing.shareChanges()
    expect(port.context).not.toHaveBeenCalled()
  })
  it('should preserve the draft and baseline on a save conflict', async () => {
    const {editing, port} = mount()
    vi.mocked(port.call).mockResolvedValueOnce({
      content: [],
      isError: true,
      structuredContent: {code: 'write-conflict'},
    })
    editing.change('draft')
    expect(await editing.save()).toBe(false)
    expect(editing.source()).toBe('draft')
    expect(editing.revision()).toBe('v1')
    expect(editing.feedback()).toContain('다른 곳에서')
  })
  it('should retain a successful save for a file left while the request was pending', async () => {
    const {editing, port, setCurrent} = mount()
    const saved = Promise.withResolvers<CallToolResult>()
    vi.mocked(port.call).mockReturnValueOnce(saved.promise)
    editing.change('draft')
    const saving = editing.save()
    setCurrent(session('helper.ts'))
    saved.resolve({
      content: [],
      structuredContent: {document: session('main.ts', 'draft', 'v2').document},
    })
    await saving
    expect(editing.source()).toBe('original')
    setCurrent(session())
    expect(editing.source()).toBe('draft')
    expect(editing.dirty()).toBe(false)
  })
  it('should wait for the unsaved-change choice before allowing close', async () => {
    const {editing} = mount()
    editing.change('draft')
    const closing = editing.confirmLeave()
    expect(editing.confirming()).toBe(true)
    editing.resolveLeave('cancel')
    expect(await closing).toBe(false)
    expect(editing.dirty()).toBe(true)
    const discarding = editing.confirmLeave()
    editing.resolveLeave('discard')
    expect(await discarding).toBe(true)
    expect(editing.pendingFiles()).toEqual([])
  })
  it('should keep close pending after a failed save and allow cancelling', async () => {
    const {editing, port} = mount()
    vi.mocked(port.call).mockResolvedValueOnce({
      content: [],
      isError: true,
      structuredContent: {code: 'write-failed'},
    })
    editing.change('draft')
    const closing = editing.confirmLeave()
    await editing.resolveLeave('save')
    expect(editing.confirming()).toBe(true)
    editing.resolveLeave('cancel')
    expect(await closing).toBe(false)
    expect(editing.source()).toBe('draft')
  })
  it('should coalesce duplicate saves and refuse to discard a pending write', async () => {
    const {editing, port} = mount()
    const saved = Promise.withResolvers<CallToolResult>()
    vi.mocked(port.call).mockReturnValueOnce(saved.promise)
    editing.change('draft')
    const saving = editing.save()
    const second = editing.save()
    editing.discard()
    expect(editing.dirty()).toBe(true)
    expect(port.call).toHaveBeenCalledOnce()
    saved.resolve({
      content: [],
      structuredContent: {document: session('main.ts', 'draft', 'v2').document},
    })
    expect(await saving).toBe(true)
    expect(await second).toBe(true)
  })
  it('should queue a different file save behind an outstanding write', async () => {
    const {editing, port, setCurrent} = mount()
    const saved = Promise.withResolvers<CallToolResult>()
    vi.mocked(port.call).mockReturnValueOnce(saved.promise)
    editing.change('main draft')
    const mainSave = editing.save()
    setCurrent(session('helper.ts'))
    editing.change('helper draft')
    const helperSave = editing.save()
    saved.resolve({
      content: [],
      structuredContent: {document: session('main.ts', 'main draft', 'v2').document},
    })
    expect(await mainSave).toBe(true)
    expect(await helperSave).toBe(true)
    expect(port.call).toHaveBeenCalledTimes(2)
    expect(port.call).toHaveBeenLastCalledWith(
      'code.write',
      expect.objectContaining({path: 'helper.ts', source: 'helper draft'}),
    )
    expect(editing.pendingFiles()).toEqual([])
  })
})
