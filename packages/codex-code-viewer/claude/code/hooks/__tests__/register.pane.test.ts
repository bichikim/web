import {activateTree, editLine, paneTarget, projectFixture, required} from './fixture'
import {readField} from './read-field'
/* eslint-disable eslint-js/camelcase -- Claude tool arguments use snake case. */
import {expect, test} from 'claude-code/testing'

test('should preserve drafts and attach unsaved snapshots after following', async (engine, on) => {
  const fixture = projectFixture(on)
  on('prompt.submit', (_, event) => ({context: event.context, text: event.text}))
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const pane = await engine.ui.mount(paneTarget)
  await pane.input({key: 'path', text: 'a.ts'})
  expect(fixture.notices).toEqual([])
  await pane.press({key: 'edit'})
  await editLine(pane, 1, "export const value = 'draft-only-secret'")
  await pane.press({key: 'document-more'})
  await pane.press({key: 'selection-tools'})
  await pane.press({key: 'attach'})
  await engine.tool.call({file_path: '/project/b.ts', offset: 1, tool: 'Read'})
  expect(JSON.stringify(await pane.drawn())).toContain('b.ts:1:1')
  expect(JSON.stringify(await pane.drawn())).toContain('a.ts *')
  expect(JSON.stringify(await pane.drawn())).toContain('첨부 1')
  await pane.press({key: 'draft:a.ts'})
  expect(JSON.stringify(await pane.drawn())).toContain('draft-only-secret')
  const outcome = await engine.prompt.submit({
    context: ['existing context'],
    origin: {kind: 'composer'},
    text: '이 첨부를 설명해줘',
    wait: false,
  })
  expect(outcome.text).toBe('이 첨부를 설명해줘')
  expect(outcome.context).toEqual([
    'existing context',
    expect.stringContaining('draft-only-secret'),
  ])
  const peer = await engine.prompt.submit({origin: {kind: 'peer'}, text: 'background', wait: false})
  expect(peer.context).toBeUndefined()
  expect(required(fixture.files.get('a.ts')).source).toContain("'disk'")
  expect(fixture.calls.filter((entry) => entry === 'mcp__Claude_Browser__navigate')).toHaveLength(1)
  expect(fixture.requests.every((entry) => entry.arguments.session === 'viewer-session')).toBe(true)
})

test('should save against the original revision and retain a draft on a disk conflict', async (engine, on) => {
  const fixture = projectFixture(on)
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const pane = await engine.ui.mount(paneTarget)
  await pane.input({key: 'path', text: 'a.ts'})
  expect(fixture.notices).toEqual([])
  await pane.press({key: 'edit'})
  await editLine(pane, 1, 'export const saved = 1')
  await pane.press({key: 'save'})
  expect(required(fixture.files.get('a.ts')).source).toBe('export const saved = 1\n')
  expect(required(fixture.requests.at(-1)).arguments.revision).toBe('a1')
  await pane.press({key: 'edit'})
  await editLine(pane, 1, 'export const draft = 2')
  fixture.files.set('a.ts', {revision: 'external', source: 'external edit\n'})
  await engine.tool.call({file_path: '/project/a.ts', tool: 'Read'})
  expect(JSON.stringify(await pane.drawn())).toContain('디스크 변경 · 초안 유지')
  await pane.press({key: 'save'})
  expect(required(fixture.files.get('a.ts')).source).toBe('external edit\n')
  expect(JSON.stringify(await pane.drawn())).toContain('export const draft = 2')
  expect(fixture.notices.at(-1)).toContain('초안을 유지했습니다')
  expect(
    readField(fixture.stored.get('pane:/project:session-one'), 'documents', 0, 'source'),
  ).toContain('draft = 2')
})

test('should retain the file after a rejected project escape', async (engine, on) => {
  const fixture = projectFixture(on)
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const pane = await engine.ui.mount(paneTarget)
  await pane.input({key: 'path', kind: 'change', text: 'b'})
  await pane.press({key: 'search'})
  await pane.press({key: 'file:b.ts'})
  await pane.input({key: 'path', text: '../outside.ts'})
  expect(JSON.stringify(await pane.drawn())).toContain('b.ts:1:1')
  expect(fixture.notices.at(-1)).toContain('outside-workspace')
})

test('should restore session drafts and snapshots while retaining Browser startup', async (engine, on) => {
  const fixture = projectFixture(on)
  fixture.stored.set('pane:/project:session-one', {
    active: 'a.ts',
    attachments: [{end: 1, path: 'a.ts', start: 1, text: 'restored snapshot'}],
    documents: [
      {
        base: "export const value = 'disk'\n",
        column: 1,
        conflict: false,
        line: 1,
        path: 'a.ts',
        revision: 'a1',
        source: 'restored draft\n',
      },
    ],
  })
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const pane = await engine.ui.mount(paneTarget)
  expect(JSON.stringify(await pane.drawn())).toContain('restored draft')
  expect(JSON.stringify(await pane.drawn())).toContain('첨부 1')
  expect(fixture.calls).toContain('mcp__Claude_Browser__navigate')
})

test('should preserve corrupt stored drafts and continue Browser startup', async (engine, on) => {
  const fixture = projectFixture(on)
  fixture.stored.set('pane:/project:session-one', 'unreadable drafts')
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const pane = await engine.ui.mount(paneTarget)
  await pane.input({key: 'path', text: 'a.ts'})
  expect(fixture.stored.get('pane:/project:session-one')).toBe('unreadable drafts')
  expect(fixture.notices[0]).toContain('덮어쓰지 않았습니다')
  expect(fixture.calls).toContain('mcp__Claude_Browser__navigate')
})

test('should share search, undo, redo and patch snapshots while preserving navigation history', async (engine, on) => {
  const fixture = projectFixture(on)
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const pane = await engine.ui.mount(paneTarget)
  await pane.input({key: 'path', text: 'a.ts:2:1'})
  expect(JSON.stringify(await pane.drawn())).toContain('a.ts:2:1')
  await pane.press({key: 'document-more'})
  await pane.press({key: 'find-tools'})
  await pane.input({key: 'find', text: 'DISK'})
  expect(JSON.stringify(await pane.drawn())).toContain('a.ts:1:23')
  await pane.press({key: 'edit'})
  await editLine(pane, 1, "export const value = 'edited'")
  await pane.press({key: 'edit-more'})
  await pane.press({key: 'undo'})
  expect(JSON.stringify(await pane.drawn())).toContain("export const value = 'disk'")
  await pane.press({key: 'redo'})
  expect(JSON.stringify(await pane.drawn())).toContain("export const value = 'edited'")
  await pane.press({key: 'attach-changes'})
  expect(
    readField(fixture.stored.get('pane:/project:session-one'), 'attachments', 0, 'text'),
  ).toContain('-export const value')
  expect(
    readField(fixture.stored.get('pane:/project:session-one'), 'attachments', 0, 'text'),
  ).toContain('Base revision')
  await pane.input({key: 'path', text: 'b.ts'})
  await pane.press({key: 'back'})
  expect(JSON.stringify(await pane.drawn())).toContain('edited')
  await pane.press({key: 'forward'})
  expect(JSON.stringify(await pane.drawn())).toContain('b.ts:1:1')
  await pane.press({key: 'document-more'})
  await pane.press({key: 'find-tools'})
  expect(JSON.stringify(await pane.drawn())).toContain('0/0')
})

test('should expand the shared file tree and navigate against draft sources', async (engine, on) => {
  const fixture = projectFixture(on)
  fixture.files.set('src/nested.ts', {revision: 'nested', source: 'export const nested = 3\n'})
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const pane = await engine.ui.mount(paneTarget)
  expect(await pane.find({in: 'file-tree:viewport', key: 'tree:src/nested.ts'})).toBeUndefined()
  await activateTree(pane, 'src')
  await activateTree(pane, 'src/nested.ts')
  await pane.press({key: 'edit'})
  await editLine(pane, 1, 'export const nested = 4')
  await pane.press({key: 'document-more'})
  await pane.press({key: 'jump-tools'})
  await pane.press({key: 'definition'})
  expect(JSON.stringify(await pane.drawn())).toContain('b.ts:1:1')
  const navigation = fixture.requests.find((request) => request.name === 'code.navigate')
  expect(required(navigation).arguments).toMatchObject({
    offset: 0,
    path: 'src/nested.ts',
    revision: 'nested',
    sources: [{path: 'src/nested.ts', source: 'export const nested = 4\n'}],
  })
})

test('should render native Markdown and parse table previews through the shared backend', async (engine, on) => {
  const fixture = projectFixture(on)
  fixture.files.set('notes.md', {revision: 'md', source: '# Heading\n\n**Bold**'})
  fixture.files.set('rows.csv', {revision: 'csv', source: 'name,count\n"quoted, name",2'})
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const pane = await engine.ui.mount(paneTarget)
  await pane.input({key: 'path', text: 'notes.md'})
  await pane.press({key: 'preview'})
  expect(readField(await pane.find({type: 'Markdown'}), 'props', 'text')).toBe(
    '# Heading\n\n**Bold**',
  )
  await pane.input({key: 'path', text: 'rows.csv'})
  await pane.press({key: 'preview'})
  expect(JSON.stringify(await pane.drawn())).toContain('quoted, name │ 2')
  await pane.input({key: 'table-filter', kind: 'change', text: 'missing'})
  expect(JSON.stringify(await pane.drawn())).not.toContain('quoted, name │ 2')
  await pane.input({key: 'table-filter', kind: 'change', text: ''})
  await pane.select({key: 'table-sort', value: '1'})
  const ordered = JSON.stringify(await pane.drawn())
  expect(ordered.indexOf('Beta │ 1')).toBeLessThan(ordered.indexOf('quoted, name │ 2'))
  expect(ordered.indexOf('quoted, name │ 2')).toBeLessThan(ordered.indexOf('alpha │ 10'))
  await pane.press({key: 'table-header'})
  expect(JSON.stringify(await pane.drawn())).toContain('열 1 │ 열 2')

  expect(
    required(fixture.requests.find((request) => request.name === 'code.preview')).arguments.source,
  ).toBe('name,count\n"quoted, name",2')
})

test('should create and rename through the existing revision-checked file tools', async (engine, on) => {
  const fixture = projectFixture(on)
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const pane = await engine.ui.mount(paneTarget)
  await pane.press({key: 'new-file'})
  await pane.input({key: 'entry-name', kind: 'change', text: 'created.ts'})
  await pane.press({key: 'create-file'})
  await activateTree(pane, 'created.ts')
  await activateTree(pane, 'created.ts', 'menu')
  await pane.press({key: 'rename-entry'})
  await pane.input({key: 'entry-name', kind: 'change', text: 'renamed.ts'})
  await pane.press({key: 'rename-confirm'})
  expect(JSON.stringify(await pane.drawn())).toContain('renamed.ts:1:1')
  const rename = fixture.requests.find((request) => request.name === 'code.rename')
  expect(required(rename).arguments).toMatchObject({
    name: 'renamed.ts',
    path: 'created.ts',
    revision: 'created',
  })
  await pane.press({key: 'edit'})
  await editLine(pane, 1, 'draft')
  await activateTree(pane, 'renamed.ts', 'menu')
  await pane.press({key: 'copy-entry'})
  expect(fixture.notices.at(-1)).toContain('미저장 변경을 먼저')
})

test('should render an empty table without header or sorting controls', async (engine, on) => {
  const fixture = projectFixture(on)
  fixture.files.set('empty.csv', {revision: 'empty', source: ''})
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const pane = await engine.ui.mount(paneTarget)
  await pane.input({key: 'path', text: 'empty.csv'})
  await pane.press({key: 'preview'})
  expect(JSON.stringify(await pane.drawn())).toContain('표가 비어 있습니다.')
  expect(await pane.find({key: 'table-sort'})).toBeUndefined()
})
