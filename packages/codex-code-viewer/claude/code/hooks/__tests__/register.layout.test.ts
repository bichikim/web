import {readText} from './read-text'
import {activateTree, editLine, paneTarget, projectFixture, required, treeRows} from './fixture'
import {readField} from './read-field'
/* eslint-disable eslint-js/camelcase -- Claude tool inputs use snake case. */
import {expect, test} from 'claude-code/testing'

test('should align every painted file row with the same native cell used by pointer input', async (engine, on) => {
  const fixture = projectFixture(on)
  const fileCount = 30
  for (let index = 0; index < fileCount; index += 1) {
    fixture.files.set(`row-${String(index).padStart(2, '0')}.ts`, {
      revision: 'r1',
      source: String(index),
    })
  }
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const pane = await engine.ui.mount(paneTarget)
  const painted = await pane.find({key: 'tree-row:row-20.ts'})
  expect(required(painted).props.height).toBe(1)
  const inputs = (await pane.findAll({type: 'Client'})).filter((entry) =>
    readText(entry.props.key).startsWith('file-tree:'),
  )
  expect(inputs).toHaveLength(1)
  const messageBudget = 150_000
  expect(JSON.stringify(await pane.drawn()).length).toBeLessThan(messageBudget)
  await pane.pointer({
    button: 'left',
    in: 'file-tree:viewport',
    type: 'down',
    x: 5,
    y: (await treeRows(pane)).findIndex((row) => row.path === 'row-20.ts'),
  })
  expect(JSON.stringify(await pane.drawn())).toContain('row-20.ts:1:1')
  expect(fixture.notices).toEqual([])
})

test('should draw icon actions as circles without stretching their SVG viewport', async (engine, on) => {
  projectFixture(on)
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const pane = await engine.ui.mount(paneTarget)
  const icons = (await pane.findAll({type: 'Svg'})).filter((entry) =>
    ['파일', '설정', '새 파일', '새 폴더', '새로고침', '현재 파일 표시'].includes(
      readText(entry.props.alt),
    ),
  )
  const iconCount = 6
  expect(icons).toHaveLength(iconCount)
  for (const icon of icons) {
    expect(icon.props.source).toContain('<circle ')
    expect(icon.props.source).toContain('preserveAspectRatio="xMidYMid meet"')
  }
})

test('should keep the tree next to the document and reveal the active file through a filter', async (engine, on) => {
  const fixture = projectFixture(on)
  fixture.files.set('src/deep/value.ts', {revision: 'v1', source: 'export const value = 1\n'})
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const pane = await engine.ui.mount({
    ...paneTarget,
    props: {...paneTarget.props, bodyColumns: 100},
  })
  await pane.input({key: 'path', text: 'src/deep/value.ts'})
  await pane.press({key: 'tree-reveal'})
  expect((await treeRows(pane)).map((row) => row.path)).toContain('src/deep/value.ts')
  expect(await pane.find({key: 'code-editor', type: 'Client'})).toBeDefined()
  await pane.input({key: 'tree-filter', kind: 'change', text: 'deep/value'})
  expect((await treeRows(pane)).map((row) => row.path)).toContain('src/deep/value.ts')
  expect((await treeRows(pane)).map((row) => row.path)).not.toContain('a.ts')
  await pane.press({key: 'files'})
  expect(await pane.find({key: 'file-tree:viewport'})).toBeUndefined()
  expect(await pane.find({key: 'code-editor', type: 'Client'})).toBeDefined()
})

test('should expose editing and selection tools only when requested and attach exact columns', async (engine, on) => {
  const fixture = projectFixture(on)
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const pane = await engine.ui.mount(paneTarget)
  await pane.input({key: 'path', text: 'a.ts'})
  expect(await pane.find({key: 'edit:a.ts:1'})).toBeUndefined()
  expect(await pane.find({key: 'find'})).toBeUndefined()
  await pane.press({key: 'edit'})
  await editLine(pane, 1, 'hello selected world')
  await pane.press({key: 'document-more'})
  await pane.press({key: 'selection-tools'})
  await pane.input({key: 'selection-column', kind: 'change', text: '7'})
  await pane.input({key: 'selection-end-column', kind: 'change', text: '15'})
  await pane.press({key: 'attach'})
  const attachment = readField(
    fixture.stored.get('pane:/project:session-one'),
    'attachments',
    0,
    'text',
  )
  expect(attachment).toContain('a.ts:1:7-1:15')
  expect(attachment).toContain('\nselected')
  expect(attachment).not.toContain('hello selected world')
})

test('should pause automatic following while preserving explicit navigation and drafts', async (engine, on) => {
  const fixture = projectFixture(on)
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const pane = await engine.ui.mount(paneTarget)
  await pane.input({key: 'path', text: 'a.ts'})
  await pane.press({key: 'edit'})
  await editLine(pane, 1, 'draft text')
  await pane.press({key: 'settings'})
  await pane.press({key: 'follow-toggle'})
  await pane.press({key: 'settings-close'})
  await engine.tool.call({file_path: '/project/b.ts', tool: 'Read'})
  expect(JSON.stringify(await pane.drawn())).toContain('a.ts:1:1')
  await pane.input({key: 'path', text: 'b.ts'})
  expect(JSON.stringify(await pane.drawn())).toContain('b.ts:1:1')
  expect(
    readField(fixture.stored.get('pane:/project:session-one'), 'documents', 0, 'source'),
  ).toContain('draft text')
})

test('should retain unsaved content on refresh and confirm before discarding it', async (engine, on) => {
  const fixture = projectFixture(on)
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const pane = await engine.ui.mount(paneTarget)
  await pane.input({key: 'path', text: 'a.ts'})
  await pane.press({key: 'edit'})
  await editLine(pane, 1, 'draft text')
  fixture.files.set('a.ts', {revision: 'external', source: 'new disk\n'})
  await pane.press({key: 'refresh'})
  expect(JSON.stringify(await pane.drawn())).toContain('디스크 변경 · 초안 유지')
  await pane.press({key: 'edit-more'})
  await pane.press({key: 'discard'})
  await pane.press({key: 'discard-cancel'})
  expect(readField(fixture.stored.get('pane:/project:session-one'), 'documents', 0, 'source')).toBe(
    'draft text\n',
  )
})

test('should persist settings and manage file attachments', async (engine, on) => {
  const fixture = projectFixture(on)
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const pane = await engine.ui.mount(paneTarget)
  await pane.press({key: 'settings'})
  await pane.select({key: 'setting-wrap', value: 'truncate-end'})
  await pane.select({key: 'setting-rows', value: '12'})
  await pane.press({key: 'settings-close'})
  await pane.input({key: 'path', text: 'a.ts'})
  expect(
    readField(await pane.find({key: 'code-editor', type: 'Client'}), 'props', 'props', 'wrap'),
  ).toBe('truncate-end')
  await activateTree(pane, 'a.ts', 'menu')
  await pane.press({key: 'attach-entry'})
  expect(
    readField(fixture.stored.get('pane:/project:session-one'), 'attachments', 0, 'text'),
  ).toContain('selected the file')
  await pane.press({key: 'attachments'})
  await pane.press({key: 'attachments-clear'})
  expect(readField(fixture.stored.get('pane:/project:session-one'), 'attachments')).toEqual([])
})
