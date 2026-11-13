import {readNumber} from './read-number'
import {activateTree, paneTarget, projectFixture, required} from './fixture'
import {readField} from './read-field'
import {expect, test} from 'claude-code/testing'

test('should preserve source selection and placement when code actions open', async (engine, on) => {
  const fixture = projectFixture(on, true)
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const pane = await engine.ui.mount(paneTarget)
  await pane.input({key: 'path', text: 'a.ts'})
  await pane.pointer({button: 'left', in: 'code-editor', type: 'down', x: 5, y: 0})
  await pane.pointer({button: 'left', in: 'code-editor', type: 'move', x: 10, y: 0})
  await pane.pointer({button: 'left', in: 'code-editor', type: 'up', x: 10, y: 0})
  const before = readField(await pane.find({key: 'code-editor'}), 'props', 'props')
  await pane.pointer({button: 'right', in: 'code-editor', type: 'down', x: 7, y: 0})
  expect(await pane.find({key: 'pane-popover'})).toBeDefined()
  const after = readField(await pane.find({key: 'code-editor'}), 'props', 'props')
  expect([readField(after, 'anchor'), readField(after, 'head'), readField(after, 'start')]).toEqual(
    [readField(before, 'anchor'), readField(before, 'head'), readField(before, 'start')],
  )
  await pane.press({key: 'context-copy'})
  expect(fixture.clipboard.text).toBe('expor')
  expect(await pane.find({key: 'pane-popover'})).toBeUndefined()
  await pane.pointer({button: 'right', in: 'code-editor', type: 'down', x: 7, y: 0})
  await pane.press({key: 'context-attach'})
  expect(
    readField(fixture.stored.get('pane:/project:session-one'), 'attachments', 0, 'text'),
  ).toContain('expor')
})

test('should keep tree context actions in a floating menu and open rename only when chosen', async (engine, on) => {
  const fixture = projectFixture(on)
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const pane = await engine.ui.mount(paneTarget)
  await pane.input({key: 'path', text: 'a.ts'})
  await activateTree(pane, 'a.ts', 'menu')
  expect(await pane.find({key: 'pane-popover'})).toBeDefined()
  expect(await pane.find({key: 'entry-name'})).toBeUndefined()
  await pane.press({key: 'copy-entry'})
  await activateTree(pane, 'a.ts', 'menu')
  expect(await pane.find({key: 'paste-entry'})).toBeDefined()
  await pane.press({key: 'rename-entry'})
  await pane.input({key: 'entry-name', kind: 'change', text: 'renamed.ts'})
  await pane.press({key: 'rename-confirm'})
  expect(fixture.files.has('renamed.ts')).toBe(true)
  expect(await pane.find({key: 'pane-popover'})).toBeUndefined()
})

test('should create a file from the submitted name without requiring an earlier change event', async (engine, on) => {
  const fixture = projectFixture(on)
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const pane = await engine.ui.mount(paneTarget)
  await pane.press({key: 'new-file'})
  await pane.input({key: 'entry-name', text: 'submitted.ts'})
  expect(fixture.files.has('submitted.ts')).toBe(true)
  expect(JSON.stringify(await pane.drawn())).toContain('submitted.ts:1:1')
})

test('should copy a tree entry by shortcut and rename the focused row with F2', async (engine, on) => {
  const fixture = projectFixture(on)
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const pane = await engine.ui.mount(paneTarget)
  await activateTree(pane, 'a.ts', 'focus')
  await pane.key({ctrl: true, in: 'file-tree:viewport', key: 'c'})
  expect(required(fixture.requests.at(-1)).name).toBe('code.entry')
  expect(await pane.find({key: 'pane-popover'})).toBeUndefined()
  await pane.key({in: 'file-tree:viewport', key: 'f2'})
  expect(await pane.find({key: 'entry-name'})).toBeDefined()
  await pane.input({key: 'entry-name', text: 'renamed.ts'})
  expect(fixture.files.has('renamed.ts')).toBe(true)
  expect(fixture.files.has('a.ts')).toBe(false)
})

test('should open code context actions by keyboard without changing the draft', async (engine, on) => {
  const fixture = projectFixture(on)
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const pane = await engine.ui.mount(paneTarget)
  await pane.input({key: 'path', text: 'a.ts'})
  await pane.key({in: 'code-editor', key: 'f10', shift: true})
  expect(await pane.find({key: 'context-attach'})).toBeDefined()
  expect(readField(fixture.stored.get('pane:/project:session-one'), 'documents', 0, 'source')).toBe(
    required(fixture.files.get('a.ts')).source,
  )
})

test('should show grouped reference destinations as an overlay and close it from outside', async (engine, on) => {
  const fixture = projectFixture(on)
  fixture.destinations.set('a.ts:0', {
    kind: 'references',
    locations: [
      {column: 1, line: 1, path: 'b.ts', preview: 'first()'},
      {column: 1, line: 2, path: 'b.ts', preview: 'second()'},
    ],
  })
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const pane = await engine.ui.mount(paneTarget)
  await pane.input({key: 'path', text: 'a.ts'})
  const before = readField(await pane.find({key: 'code-editor'}), 'props', 'props', 'rows')
  await pane.key({in: 'code-editor', key: 'f12'})
  expect(await pane.find({key: 'reference-group:b.ts'})).toBeDefined()
  expect(await pane.find({key: 'location:1'})).toBeDefined()
  expect(readField(await pane.find({key: 'code-editor'}), 'props', 'props', 'rows')).toBe(before)
  await pane.press({key: 'reference-group:b.ts'})
  expect(await pane.find({key: 'location:1'})).toBeUndefined()
  await pane.press({key: 'reference-group:b.ts'})
  await pane.pointer({button: 'left', in: 'popover-backdrop', type: 'down', x: 0, y: 0})
  expect(await pane.find({key: 'pane-popover'})).toBeUndefined()
})

test('should persist preview lines and size reference destinations accordingly', async (engine, on) => {
  const previewCount = 3
  const fixture = projectFixture(on)
  fixture.destinations.set('a.ts:0', {
    kind: 'references',
    locations: [
      {column: 1, line: 1, path: 'b.ts', preview: 'first\nsecond\nthird\nfourth'},
      {column: 1, line: 2, path: 'b.ts', preview: 'single'},
    ],
  })
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const pane = await engine.ui.mount(paneTarget)
  await pane.input({key: 'path', text: 'a.ts'})
  await pane.press({key: 'settings'})
  await pane.select({key: 'setting-preview-lines', value: String(previewCount)})
  await pane.press({key: 'settings-close'})
  await pane.key({in: 'code-editor', key: 'f12'})
  expect(readField(fixture.stored.get('pane:/project:session-one:view'), 'previewLines')).toBe(
    previewCount,
  )
  expect(readField(await pane.find({key: 'control:location:0'}), 'props', 'props', 'rows')).toBe(
    previewCount,
  )
  expect(readField(await pane.find({key: 'control:location:1'}), 'props', 'props', 'rows')).toBe(1)
})

test('should translate UI actions while preserving project filenames and source text', async (engine, on) => {
  const fixture = projectFixture(on)
  fixture.files.set('저장', {revision: 'ko', source: 'const message = "저장"'})
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const pane = await engine.ui.mount(paneTarget)
  await pane.press({key: 'settings'})
  await pane.select({key: 'setting-language', value: 'en'})
  expect(readField(await pane.find({key: 'settings-close'}), 'props', 'label')).toBe('Close')
  await pane.press({key: 'settings-close'})
  expect(readField(await pane.find({key: 'search'}), 'props', 'label')).toBe('Search')
  await pane.input({key: 'path', kind: 'change', text: '저장'})
  await pane.press({key: 'search'})
  expect(readField(await pane.find({key: 'file:저장'}), 'props', 'label')).toBe('저장')
  await pane.press({key: 'file:저장'})
  expect(readField(await pane.find({key: 'code-editor'}), 'props', 'props', 'source')).toContain(
    '"저장"',
  )
  expect(readField(fixture.stored.get('pane:/project:session-one:view'), 'language')).toBe('en')
})

test('should activate painted icon controls once and reject an outdated control press', async (engine, on) => {
  projectFixture(on)
  on('ui.focus', () => ({}))
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const pane = await engine.ui.mount(paneTarget)
  await pane.input({key: 'path', text: 'a.ts'})
  const previous = readNumber(
    readField(await pane.find({key: 'control:files'}), 'props', 'props', 'generation'),
  )
  await pane.post({kind: 'press'}, {in: 'control:files'})
  expect(await pane.find({key: 'file-tree:viewport'})).toBeDefined()
  await engine.ui.focus({
    component: 'Pane',
    element: 'files',
    origin: {kind: 'person'},
    requestId: 'code-viewer-pane',
  })
  expect(readField(await pane.find({key: 'control:files'}), 'props', 'props', 'generation')).toBe(
    previous,
  )
  await pane.pointer({button: 'left', in: 'control:files', type: 'down', x: 1, y: 0})
  await pane.pointer({button: 'left', in: 'control:files', type: 'up', x: 1, y: 0})
  expect(await pane.find({key: 'file-tree:viewport'})).toBeUndefined()
  await pane.post({generation: previous, kind: 'press'}, {in: 'control:files'})
  expect(await pane.find({key: 'file-tree:viewport'})).toBeUndefined()
  await pane.press({key: 'files'})
  expect(await pane.find({key: 'file-tree:viewport'})).toBeDefined()
  await pane.pointer({button: 'left', in: 'control:new-file', type: 'down', x: 1, y: 0})
  await pane.pointer({button: 'left', in: 'control:new-file', type: 'up', x: 1, y: 0})
  expect(await pane.find({key: 'entry-name'})).toBeDefined()
})

test('should open code and tree actions with the modified menu shortcut', async (engine, on) => {
  projectFixture(on)
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const pane = await engine.ui.mount(paneTarget)
  await pane.input({key: 'path', text: 'a.ts'})
  await pane.key({ctrl: true, in: 'code-editor', key: '>', shift: true})
  expect(await pane.find({key: 'context-attach'})).toBeDefined()
  await pane.pointer({button: 'left', in: 'popover-backdrop', type: 'down', x: 0, y: 0})
  await activateTree(pane, 'a.ts', 'focus')
  await pane.key({ctrl: true, in: 'file-tree:viewport', key: '.', shift: true})
  expect(await pane.find({key: 'rename-entry'})).toBeDefined()
})

test('should read an image at its displayed revision and render an embedded preview', async (engine, on) => {
  const fixture = projectFixture(on)
  fixture.files.set('image.png', {
    media: {kind: 'image', mimeType: 'image/png', size: 2},
    revision: 'image1',
    source: '',
  })
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const pane = await engine.ui.mount(paneTarget)
  await pane.input({key: 'path', text: 'image.png'})
  expect(JSON.stringify(await pane.drawn())).toContain('data:image/png;base64,AAE=')
  expect(fixture.requests.at(-1)).toMatchObject({
    arguments: {offset: 0, path: 'image.png', revision: 'image1'},
    name: 'code.media',
  })
})

test('should show an image size limit without reading oversized media bytes', async (engine, on) => {
  const fixture = projectFixture(on)
  fixture.files.set('large.png', {
    media: {kind: 'image', mimeType: 'image/png', size: 1000000},
    revision: 'large1',
    source: '',
  })
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const pane = await engine.ui.mount(paneTarget)
  await pane.input({key: 'path', text: 'large.png'})
  expect(JSON.stringify(await pane.drawn())).toContain(
    '이미지 크기가 Pane 표시 한도를 초과했습니다.',
  )
  expect(fixture.requests.some((request) => request.name === 'code.media')).toBe(false)
})

test('should zoom a PNG with shared camera geometry and restore fit without changing the draft', async (engine, on) => {
  const fixture = projectFixture(on)
  fixture.files.set('image.png', {
    media: {kind: 'image', mimeType: 'image/png', size: 29},
    revision: 'image1',
    source: '',
  })
  fixture.previews.set('image.png', {data: 'iVBORw0KGgoAAAANSUhEUgAAACAAAAAQCAIAAAA=', next: 29})
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const pane = await engine.ui.mount(paneTarget)
  await pane.input({key: 'path', text: 'image.png'})
  expect(readField(await pane.find({key: 'image-percent'}), 'props', 'value')).toBe('100')
  await pane.input({key: 'image-percent', text: '1600'})
  expect(JSON.stringify(await pane.drawn())).toContain('width=\\\"512\\\"')
  expect(readField(await pane.find({key: 'image-percent'}), 'props', 'value')).toBe('1600')
  await pane.press({key: 'image-zoom-out'})
  expect(readField(await pane.find({key: 'image-percent'}), 'props', 'value')).toBe('1280')
  await pane.press({key: 'image-fit'})
  expect(readField(await pane.find({key: 'image-percent'}), 'props', 'value')).toBe('100')
  await pane.key({in: 'image-preview', key: '+'})
  expect(readField(await pane.find({key: 'image-percent'}), 'props', 'value')).toBe('125')
  await pane.key({in: 'image-preview', key: 'home'})
  expect(readField(await pane.find({key: 'image-percent'}), 'props', 'value')).toBe('100')
  await pane.post({kind: 'save'}, {in: 'image-preview'})
  expect(fixture.requests.some((request) => request.name === 'code.save')).toBe(false)
  expect(readField(fixture.stored.get('pane:/project:session-one'), 'documents', 0, 'source')).toBe(
    '',
  )
})

test('should reuse table filtering and sheet selection for an Excel preview', async (engine, on) => {
  const fixture = projectFixture(on)
  fixture.files.set('book.xlsx', {
    media: {
      kind: 'spreadsheet',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: 200,
    },
    revision: 'book1',
    source: '',
  })
  fixture.previews.set('book.xlsx', {
    document: {
      ok: true,
      sheets: [
        {
          columnNames: ['A', 'B'],
          columns: 2,
          name: 'First',
          ok: true,
          rows: [
            ['alpha', '2'],
            ['beta', '1'],
          ],
          truncated: false,
        },
        {
          columnNames: ['A', 'B'],
          columns: 2,
          name: 'Second',
          ok: true,
          rows: [['gamma', '3']],
          truncated: false,
        },
      ],
    },
    kind: 'spreadsheet',
  })
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const pane = await engine.ui.mount(paneTarget)
  await pane.input({key: 'path', text: 'book.xlsx'})
  expect(JSON.stringify(await pane.drawn())).toContain('alpha │ 2')
  await pane.input({key: 'table-filter', kind: 'change', text: 'beta'})
  expect(JSON.stringify(await pane.drawn())).not.toContain('alpha │ 2')
  await pane.select({key: 'table-sheet', value: '1'})
  expect(JSON.stringify(await pane.drawn())).toContain('gamma │ 3')
  expect(readField(await pane.find({key: 'table-filter'}), 'props', 'value')).toBe('')
})

test('should render Word headings and page through document blocks', async (engine, on) => {
  const fixture = projectFixture(on)
  fixture.files.set('report.docx', {
    media: {
      kind: 'word',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: 200,
    },
    revision: 'word1',
    source: '',
  })
  fixture.previews.set('report.docx', {
    document: {
      nodes: Array.from({length: 10}, (_, index) => ({
        children: [{kind: 'text', text: `Document block ${index}`}],
        kind: 'element',
        tag: index === 0 ? 'h1' : 'p',
      })),
      ok: true,
      warnings: [],
    },
    kind: 'word',
  })
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const pane = await engine.ui.mount(paneTarget)
  await pane.input({key: 'path', text: 'report.docx'})
  expect(JSON.stringify(await pane.drawn())).toContain('# Document block 0')
  await pane.press({key: 'office-next'})
  expect(JSON.stringify(await pane.drawn())).toContain('Document block 8')
  expect(JSON.stringify(await pane.drawn())).not.toContain('Document block 0')
})

test('should filter names through a native input without changing the document', async (engine, on) => {
  const fixture = projectFixture(on)
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const pane = await engine.ui.mount(paneTarget)
  await pane.input({key: 'path', text: 'a.ts'})
  expect(fixture.notices).toEqual([])
  expect(await pane.find({key: 'control:tree-filter'})).toBeUndefined()
  await pane.input({key: 'tree-filter', kind: 'change', text: 'b.ts'})
  expect(
    readField(await pane.find({key: 'file-tree:viewport'}), 'props', 'props', 'rows', 0, 'name'),
  ).toBe('b.ts')
  expect(readField(fixture.stored.get('pane:/project:session-one'), 'documents', 0, 'source')).toBe(
    required(fixture.files.get('a.ts')).source,
  )
})

test('should page and zoom a PDF while retaining its revision and source', async (engine, on) => {
  const fixture = projectFixture(on)
  fixture.files.set('pages.pdf', {
    media: {kind: 'pdf', mimeType: 'application/pdf', size: 100},
    revision: 'pdf1',
    source: '',
  })
  fixture.previews.set('pages.pdf', {
    height: 500,
    kind: 'pdf',
    pages: 3,
    text: 'A PDF page',
    uri: 'data:image/jpeg;base64,AAE=',
    width: 400,
  })
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const pane = await engine.ui.mount(paneTarget)
  await pane.input({key: 'path', text: 'pages.pdf'})
  expect(readField(await pane.find({key: 'pdf-page'}), 'props', 'value')).toBe('1')
  await pane.press({key: 'pdf-next'})
  expect(readField(await pane.find({key: 'pdf-page'}), 'props', 'value')).toBe('2')
  expect(fixture.requests.at(-1)).toMatchObject({
    arguments: {page: 2, revision: 'pdf1'},
    name: 'code.pdfPreview',
  })
  await pane.input({key: 'image-percent', text: '200'})
  expect(readField(await pane.find({key: 'image-percent'}), 'props', 'value')).toBe('200')
  await pane.input({key: 'pdf-page', text: '3'})
  expect(readField(await pane.find({key: 'pdf-page'}), 'props', 'value')).toBe('3')
  expect(readField(await pane.find({key: 'image-percent'}), 'props', 'value')).toBe('200')
  expect(await pane.find({key: 'pdf-next'})).toBeUndefined()
  await pane.input({key: 'path', text: 'a.ts'})
  await pane.input({key: 'path', text: 'pages.pdf'})
  expect(readField(await pane.find({key: 'pdf-page'}), 'props', 'value')).toBe('3')
  expect(readField(await pane.find({key: 'image-percent'}), 'props', 'value')).toBe('200')
  expect(readField(fixture.stored.get('pane:/project:session-one'), 'documents', 0, 'source')).toBe(
    '',
  )
})
