import {readNumber} from './read-number'
import {paneTarget, projectFixture, required, treeRows} from './fixture'
import {readText} from './read-text'
import {readArray} from './read-array'
import {readField} from './read-field'
import {expect, test} from 'claude-code/testing'
const COLUMN_PIXELS = 8

test('should copy and save a CR-delimited logical line without changing its separator', async (engine, on) => {
  const fixture = projectFixture(on, true)
  fixture.files.set('a.ts', {revision: 'cr', source: 'first\rsecond'})
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const pane = await engine.ui.mount(paneTarget)
  await pane.input({key: 'path', text: 'a.ts:2:1'})
  await pane.key({in: 'code-editor', key: 'home'})
  await pane.key({ctrl: true, in: 'code-editor', key: 'c'})
  expect(fixture.clipboard.text).toBe('second')
  await pane.press({key: 'edit'})
  await pane.key({in: 'code-editor', key: 'x'})
  await pane.press({key: 'save'})
  expect(fixture.files.get('a.ts')?.source).toBe('first\rxsecond')
})

test('should paint divider hover locally without saving preferences or changing the document', async (engine, on) => {
  const fixture = projectFixture(on)
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const pane = await engine.ui.mount(paneTarget)
  await pane.input({key: 'path', text: 'a.ts'})
  const color = async () =>
    readField(
      await pane.drawn({in: 'panel-divider:local-width'}),
      'children',
      1,
      'props',
      'backgroundColor',
    )
  const idle = await color()
  await pane.pointer({in: 'panel-divider:local-width', type: 'enter', x: 0, y: 0})
  expect(await color()).not.toBe(idle)
  await pane.pointer({in: 'panel-divider:local-width', type: 'leave', x: -1, y: 0})
  expect(await color()).toBe(idle)
  expect(fixture.stored.get('pane:/project:session-one:view')).toBeUndefined()
  expect(readField(fixture.stored.get('pane:/project:session-one'), 'active')).toBe('a.ts')
})

test('should highlight the hovered file without opening it and clear that feedback on leaving', async (engine, on) => {
  const fixture = projectFixture(on)
  fixture.files.set('c.ts', {revision: 'c1', source: 'export const third = 3\n'})
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const pane = await engine.ui.mount(paneTarget)
  await pane.input({key: 'path', text: 'a.ts'})
  const tree = readField(
    await pane.find({key: 'file-tree:viewport', type: 'Client'}),
    'props',
    'props',
  )
  await pane.resize({
    columns: readNumber(readField(tree, 'columns')),
    in: 'file-tree:viewport',
    rows: readNumber(readField(tree, 'rows', 'length')),
  })
  const hoveredRow = readArray(readField(tree, 'rows')).findIndex(
    (row) => readField(row, 'path') === 'b.ts',
  )
  const nextRow = readArray(readField(tree, 'rows')).findIndex(
    (row) => readField(row, 'path') === 'c.ts',
  )
  const source = async (path: string) =>
    readField(
      readArray(readField(await pane.find({key: `tree-row:${path}`}), 'children')).find(
        (entry) => readField(entry, 'type') === 'Svg',
      ),
      'props',
      'source',
    )
  expect(await source('b.ts')).not.toContain('<rect class="fill-hover"')
  await pane.pointer({in: 'file-tree:viewport', type: 'move', x: 4, y: hoveredRow})
  expect(await source('b.ts')).toContain('<rect class="fill-hover"')
  expect(JSON.stringify(await pane.drawn())).toContain('a.ts:1:1')
  expect(readField(fixture.stored.get('pane:/project:session-one'), 'active')).toBe('a.ts')
  await pane.pointer({in: 'file-tree:viewport', type: 'leave', x: 4, y: hoveredRow})
  expect(await source('b.ts')).not.toContain('<rect class="fill-hover"')
  await pane.pointer({in: 'file-tree:viewport', type: 'move', x: 4, y: hoveredRow})
  await pane.pointer({in: 'file-tree:viewport', type: 'move', x: 4, y: nextRow})
  await pane.pointer({in: 'file-tree:viewport', type: 'leave', x: 4, y: hoveredRow})
  expect(await source('c.ts')).toContain('<rect class="fill-hover"')
  expect(await source('b.ts')).not.toContain('<rect class="fill-hover"')
  expect(readField(fixture.stored.get('pane:/project:session-one'), 'active')).toBe('a.ts')
  await pane.pointer({in: 'file-tree:viewport', type: 'leave', x: 4, y: nextRow})
  expect(await source('c.ts')).not.toContain('<rect class="fill-hover"')
})

test('should resize the internal separator by pointer and keyboard without replacing the draft', async (engine, on) => {
  const fixture = projectFixture(on)
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const pane = await engine.ui.mount({
    ...paneTarget,
    props: {...paneTarget.props, bodyColumns: 100},
  })
  await pane.input({key: 'path', text: 'a.ts'})
  await pane.press({key: 'edit'})
  await pane.key({in: 'code-editor', key: 'draft '})
  const before = readField(
    fixture.stored.get('pane:/project:session-one'),
    'documents',
    0,
    'source',
  )
  const initialWidth = Number.parseInt(
    readText(
      readField(
        await pane.find({key: 'panel-divider:local-width', type: 'Client'}),
        'props',
        'props',
        'value',
      ),
    ),
    10,
  )
  await pane.pointer({button: 'left', in: 'panel-divider:local-width', type: 'down', x: 0, y: 0})
  await pane.pointer({button: 'left', in: 'panel-divider:local-width', type: 'move', x: -6, y: 0})
  expect(
    readField(await pane.drawn({in: 'panel-divider:local-width'}), 'props', 'width'),
  ).toBeGreaterThan(initialWidth / COLUMN_PIXELS + 1)
  expect(fixture.stored.get('pane:/project:session-one:view')).toBeUndefined()
  await pane.pointer({button: 'left', in: 'panel-divider:local-width', type: 'up', x: -6, y: 0})
  const changed = readField(fixture.stored.get('pane:/project:session-one:view'), 'treeWidth')
  expect(Number.parseInt(readText(changed), 10)).toBeGreaterThan(initialWidth)
  await pane.key({in: 'panel-divider:local-width', key: 'home'})
  expect(readField(fixture.stored.get('pane:/project:session-one:view'), 'treeWidth')).toBe('200px')
  expect(readField(fixture.stored.get('pane:/project:session-one'), 'documents', 0, 'source')).toBe(
    before,
  )
})

test('should keep repeated narrowing and reversal local until releasing the divider', async (engine, on) => {
  const fixture = projectFixture(on)
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const pane = await engine.ui.mount({
    ...paneTarget,
    props: {...paneTarget.props, bodyColumns: 100},
  })
  await pane.input({key: 'path', text: 'a.ts'})
  const divider = 'panel-divider:local-width'
  const minimumColumns = 26
  const maximumColumns = 70
  expect(await pane.find({key: 'panel-divider', type: 'Client'})).toBeUndefined()
  await pane.pointer({button: 'left', in: divider, type: 'down', x: 0, y: 0})
  const repetitions = 20
  // Each pointer move must observe the layout produced by the preceding move.
  /* eslint-disable no-await-in-loop */
  for (let index = 0; index < repetitions; index += 1) {
    await pane.pointer({button: 'left', in: divider, type: 'move', x: 1000, y: 0})
    expect(readField(await pane.drawn({in: divider}), 'props', 'width')).toBe(minimumColumns)
    await pane.pointer({button: 'left', in: divider, type: 'move', x: -1000, y: 0})
    expect(readField(await pane.drawn({in: divider}), 'props', 'width')).toBe(maximumColumns)
  }
  /* eslint-enable no-await-in-loop */
  expect(fixture.stored.get('pane:/project:session-one:view')).toBeUndefined()
  await pane.pointer({button: 'left', in: divider, type: 'move', x: 1000, y: 0})
  await pane.pointer({button: 'left', in: divider, type: 'up', x: 1000, y: 0})
  expect(readField(fixture.stored.get('pane:/project:session-one:view'), 'treeWidth')).toBe('200px')
  expect(readField(fixture.stored.get('pane:/project:session-one'), 'active')).toBe('a.ts')
})

test('should scroll source and tree independently when Desktop omits the wheel pointer', async (engine, on) => {
  const fixture = projectFixture(on)
  const offsets: number[] = []
  on('ui.scroll', (_, input) => {
    offsets.push(input.offset)
    return {}
  })
  const lines = 100
  fixture.files.set('a.ts', {revision: 'long', source: 'line\n'.repeat(lines)})
  for (let index = 0; index < lines; index += 1) {
    fixture.files.set(`file-${index}.ts`, {revision: 'file', source: ''})
  }
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const pane = await engine.ui.mount(paneTarget)
  await pane.input({key: 'path', text: 'a.ts'})
  const move = (by: number) =>
    engine.ui.scroll({
      bodyRows: 40,
      by,
      component: 'Pane',
      contentRows: 200,
      offset: by,
      origin: {kind: 'person'},
      requestId: paneTarget.requestId,
    })
  const distance = 10
  await move(distance)
  expect(
    readField(await pane.find({key: 'code-editor', type: 'Client'}), 'props', 'props', 'start'),
  ).toBe(distance)
  const initial = readField(
    await pane.find({key: 'file-tree:viewport', type: 'Client'}),
    'props',
    'props',
    'rows',
    0,
    'path',
  )
  await pane.pointer({in: 'file-tree:viewport', type: 'enter', x: 0, y: 0})
  await move(distance)
  expect(
    readField(
      await pane.find({key: 'file-tree:viewport', type: 'Client'}),
      'props',
      'props',
      'rows',
      0,
      'path',
    ),
  ).not.toBe(initial)
  expect(
    readField(await pane.find({key: 'code-editor', type: 'Client'}), 'props', 'props', 'start'),
  ).toBe(distance)
  await pane.pointer({in: 'code-editor', type: 'enter', x: 0, y: 0})
  await move(-distance)
  expect(
    readField(await pane.find({key: 'code-editor', type: 'Client'}), 'props', 'props', 'start'),
  ).toBe(0)
  expect(offsets).toEqual([distance, distance * 2, distance])
})

test('should wrap source and navigate visual rows while retaining logical file locations', async (engine, on) => {
  const repetitions = 30
  projectFixture(on).files.set('wrapped.ts', {
    revision: 'wrap',
    source: '한🙂abc'.repeat(repetitions),
  })
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const pane = await engine.ui.mount(paneTarget)
  await pane.input({key: 'path', text: 'wrapped.ts'})
  const initial = readField(await pane.find({key: 'code-editor', type: 'Client'}), 'props', 'props')
  expect(readField(initial, 'lines', 1, 'continuation')).toBe(true)
  expect(readField(initial, 'lines', 1, 'number')).toBe(1)
  await pane.pointer({button: 'left', in: 'code-editor', type: 'down', x: 5, y: 0})
  await pane.key({in: 'code-editor', key: 'down'})
  const moved = readField(await pane.find({key: 'code-editor', type: 'Client'}), 'props', 'props')
  expect(readField(moved, 'head')).toBe(readField(initial, 'lines', 1, 'from'))
  await pane.pointer({button: 'left', in: 'code-editor', type: 'down', x: 7, y: 1})
  await pane.pointer({button: 'left', in: 'code-editor', type: 'up', x: 7, y: 1})
  const clicked = readField(await pane.find({key: 'code-editor', type: 'Client'}), 'props', 'props')
  expect(readField(clicked, 'head')).toBe(readField(initial, 'lines', 1, 'stops', 2))
})

test('should align native row controls and open files through pointer and keyboard', async (engine, on) => {
  const fixture = projectFixture(on)
  fixture.files.set('src/nested.ts', {revision: 'nested', source: 'export const nested = 1\n'})
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const pane = await engine.ui.mount(paneTarget)
  const tree = await pane.drawn()
  expect(JSON.stringify(tree)).toContain('src')
  expect(await pane.find({key: 'tree-row:src'})).toBeDefined()
  await pane.pointer({
    button: 'left',
    in: 'file-tree:viewport',
    type: 'down',
    x: 2,
    y: (await treeRows(pane)).findIndex((row) => row.path === 'src'),
  })
  expect(JSON.stringify(await pane.drawn())).toContain('nested.ts')
  await pane.key({in: 'file-tree:viewport', key: 'down'})
  await pane.key({in: 'file-tree:viewport', key: 'return'})
  expect(JSON.stringify(await pane.drawn())).toContain('src/nested.ts:1:1')
})

test('should reject stale or forged tree commands from a client', async (engine, on) => {
  const fixture = projectFixture(on)
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const pane = await engine.ui.mount(paneTarget)
  const before = fixture.requests.length
  await pane.post({index: 0, kind: 'activate', path: '../outside.ts'}, {in: 'file-tree:viewport'})
  expect(fixture.requests.length).toBe(before)
})

test('should select in the code body and edit without line input fields', async (engine, on) => {
  const fixture = projectFixture(on)
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const pane = await engine.ui.mount(paneTarget)
  await pane.input({key: 'path', text: 'a.ts'})
  await pane.resize({columns: 60, in: 'code-editor', rows: 24})
  expect(await pane.find({key: 'edit:a.ts:1'})).toBeUndefined()
  await pane.pointer({button: 'left', in: 'code-editor', type: 'down', x: 5, y: 0})
  await pane.pointer({in: 'code-editor', type: 'move', x: 11, y: 0})
  await pane.pointer({button: 'left', in: 'code-editor', type: 'up', x: 11, y: 0})
  await pane.key({in: 'code-editor', key: 'return', meta: true, shift: true})
  expect(
    readField(fixture.stored.get('pane:/project:session-one'), 'attachments', 0, 'text'),
  ).toContain('export')
  expect(
    readField(fixture.stored.get('pane:/project:session-one'), 'attachments', 0, 'text'),
  ).not.toContain('const')
  await pane.press({key: 'edit'})
  await pane.key({ctrl: true, in: 'code-editor', key: 'a'})
  await pane.key({in: 'code-editor', key: 'replacement'})
  await pane.key({in: 'code-editor', key: 'return'})
  await pane.key({in: 'code-editor', key: 'second'})
  expect(readField(fixture.stored.get('pane:/project:session-one'), 'documents', 0, 'source')).toBe(
    'replacement\nsecond',
  )
  await pane.key({ctrl: true, in: 'code-editor', key: 's'})
  expect(required(fixture.files.get('a.ts')).source).toBe('replacement\nsecond')
})

test('should keep editor navigation on character boundaries and reveal the caret', async (engine, on) => {
  const fixture = projectFixture(on)
  const totalLines = 80
  fixture.files.set('long.ts', {
    revision: 'long',
    source: Array.from({length: totalLines}, (_, index) =>
      index === 0 ? '한글🙂 é' : `line ${index}`,
    ).join('\n'),
  })
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const pane = await engine.ui.mount(paneTarget)
  await pane.input({key: 'path', text: 'long.ts'})
  await pane.resize({columns: 60, in: 'code-editor', rows: 24})
  await pane.press({key: 'edit'})
  await pane.key({in: 'code-editor', key: 'end'})
  await pane.key({in: 'code-editor', key: 'backspace'})
  expect(
    readField(
      readText(
        readField(fixture.stored.get('pane:/project:session-one'), 'documents', 0, 'source'),
      ).split('\n'),
      0,
    ),
  ).toBe('한글🙂 ')
  await pane.key({ctrl: true, in: 'code-editor', key: 'end'})
  const end = await pane.find({key: 'code-editor', type: 'Client'})
  expect(readField(end, 'props', 'props', 'start')).toBeGreaterThan(0)
  expect(
    readNumber(readField(end, 'props', 'props', 'start')) +
      readNumber(readField(end, 'props', 'props', 'rows')),
  ).toBeGreaterThanOrEqual(totalLines)
  await pane.key({ctrl: true, in: 'code-editor', key: 'home'})
  expect(
    readField(await pane.find({key: 'code-editor', type: 'Client'}), 'props', 'props', 'start'),
  ).toBe(0)
})

test('should transport edits to a large file without posting the entire document', async (engine, on) => {
  const fixture = projectFixture(on)
  const largeSize = 120000
  fixture.files.set('large.ts', {revision: 'large', source: 'x'.repeat(largeSize)})
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const pane = await engine.ui.mount(paneTarget)
  await pane.input({key: 'path', text: 'large.ts'})
  await pane.resize({columns: 60, in: 'code-editor', rows: 24})
  await pane.press({key: 'edit'})
  await pane.key({in: 'code-editor', key: 'new'})
  expect(readField(fixture.stored.get('pane:/project:session-one'), 'documents', 0, 'source')).toBe(
    `new${'x'.repeat(largeSize)}`,
  )
})

test('should insert native space keys and deduplicate cumulative event batches', async (engine, on) => {
  const fixture = projectFixture(on)
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const pane = await engine.ui.mount(paneTarget)
  await pane.input({key: 'path', text: 'a.ts'})
  await pane.press({key: 'edit'})
  await pane.key({ctrl: true, in: 'code-editor', key: 'a'})
  await pane.key({in: 'code-editor', key: 'one'})
  await pane.key({in: 'code-editor', key: 'space'})
  expect(readField(fixture.stored.get('pane:/project:session-one'), 'documents', 0, 'source')).toBe(
    'one ',
  )
  const {props} = required(await pane.find({key: 'code-editor', type: 'Client'}))
  const event = {key: 'x', kind: 'key', serial: readNumber(readField(props, 'props', 'serial')) + 1}
  const data = {
    epoch: readNumber(readField(props, 'props', 'epoch')),
    events: [event],
    kind: 'events',
    path: readText(readField(props, 'props', 'path')),
  }
  await pane.post(data, {in: 'code-editor'})
  await pane.post(
    {...data, events: [event, {key: 'y', kind: 'key', serial: event.serial + 1}]},
    {in: 'code-editor'},
  )
  expect(readField(fixture.stored.get('pane:/project:session-one'), 'documents', 0, 'source')).toBe(
    'one xy',
  )
})

test('should copy and paste only after explicit keys when the local adapter is enabled', async (engine, on) => {
  const fixture = projectFixture(on, true)
  fixture.clipboard.text = 'pasted\n한국어'
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const pane = await engine.ui.mount(paneTarget)
  await pane.input({key: 'path', text: 'a.ts'})
  expect(fixture.requests.some((request) => request.name === 'code.paste')).toBe(false)
  await pane.press({key: 'edit'})
  await pane.key({in: 'code-editor', key: 'a', meta: true})
  await pane.key({in: 'code-editor', key: 'v', meta: true})
  expect(readField(fixture.stored.get('pane:/project:session-one'), 'documents', 0, 'source')).toBe(
    'pasted\n한국어',
  )
  await pane.key({in: 'code-editor', key: 'a', meta: true})
  await pane.key({in: 'code-editor', key: 'c', meta: true})
  expect(fixture.clipboard.text).toBe('pasted\n한국어')
  await pane.key({in: 'code-editor', key: 'x', meta: true})
  expect(readField(fixture.stored.get('pane:/project:session-one'), 'documents', 0, 'source')).toBe(
    '',
  )
  expect(required(fixture.files.get('a.ts')).source).toContain("'disk'")
})

test('should select logical lines with the gutter and retain snapshots', async (engine, on) => {
  const fixture = projectFixture(on)
  fixture.files.set('gutter.ts', {revision: 'gutter', source: 'first\nsecond\nthird'})
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const pane = await engine.ui.mount(paneTarget)
  await pane.input({key: 'path', text: 'gutter.ts'})
  await pane.pointer({button: 'left', in: 'code-editor', type: 'down', x: 1, y: 1})
  await pane.pointer({in: 'code-editor', type: 'move', x: 1, y: 2})
  await pane.pointer({button: 'left', in: 'code-editor', type: 'up', x: 1, y: 2})
  await pane.key({in: 'code-editor', key: 'return', meta: true, shift: true})
  const snapshot = readField(
    fixture.stored.get('pane:/project:session-one'),
    'attachments',
    0,
    'text',
  )
  expect(snapshot).toContain('second\nthird')
  expect(snapshot).not.toContain('first')
  await pane.press({key: 'edit'})
  await pane.key({in: 'code-editor', key: 'backspace'})
  expect(readField(fixture.stored.get('pane:/project:session-one'), 'documents', 0, 'source')).toBe(
    'first\n',
  )
  expect(readField(fixture.stored.get('pane:/project:session-one'), 'attachments', 0, 'text')).toBe(
    snapshot,
  )
})

test('should cut the current line on its shortcut and ignore function keys', async (engine, on) => {
  const fixture = projectFixture(on, true)
  fixture.files.set('cut.ts', {revision: 'cut', source: 'first\r\nsecond'})
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const pane = await engine.ui.mount(paneTarget)
  await pane.input({key: 'path', text: 'cut.ts'})
  await pane.press({key: 'edit'})
  await pane.key({in: 'code-editor', key: 'f5'})
  expect(readField(fixture.stored.get('pane:/project:session-one'), 'documents', 0, 'source')).toBe(
    'first\r\nsecond',
  )
  await pane.key({in: 'code-editor', key: 'x', meta: true})
  expect(fixture.clipboard.text).toBe('first\r\n')
  expect(readField(fixture.stored.get('pane:/project:session-one'), 'documents', 0, 'source')).toBe(
    'second',
  )
  await pane.key({in: 'code-editor', key: 'v', meta: true})
  expect(readField(fixture.stored.get('pane:/project:session-one'), 'documents', 0, 'source')).toBe(
    'first\r\nsecond',
  )
})

test('should end the selection when Desktop drops capture at an edge', async (engine, on) => {
  projectFixture(on)
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const pane = await engine.ui.mount(paneTarget)
  await pane.input({key: 'path', text: 'a.ts'})
  await pane.pointer({button: 'left', in: 'code-editor', type: 'down', x: 5, y: 0})
  await pane.pointer({in: 'code-editor', type: 'move', x: 11, y: 0})
  await pane.pointer({in: 'code-editor', type: 'leave', x: 11, y: 0})
  const head = readField(
    readField(await pane.find({key: 'code-editor', type: 'Client'}), 'props', 'props'),
    'head',
  )
  await pane.pointer({in: 'code-editor', type: 'enter', x: 20, y: 0})
  await pane.pointer({in: 'code-editor', type: 'move', x: 20, y: 0})
  expect(
    readField(await pane.find({key: 'code-editor', type: 'Client'}), 'props', 'props', 'head'),
  ).toBe(head)
})

test('should scroll a long source line horizontally without changing the draft or caret', async (engine, on) => {
  const repetitions = 20
  const fixture = projectFixture(on)
  fixture.files.set('a.ts', {
    revision: 'long',
    source: `const alpha = "${'0123456789'.repeat(repetitions)}"\n`,
  })
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const pane = await engine.ui.mount(paneTarget)
  await pane.input({key: 'path', text: 'a.ts'})
  expect(await pane.find({key: 'horizontal-scroll'})).toBeUndefined()
  await pane.press({key: 'settings'})
  await pane.select({key: 'setting-wrap', value: 'truncate-end'})
  await pane.press({key: 'settings-close'})
  const [initial] = readArray(
    readField(fixture.stored.get('pane:/project:session-one'), 'documents'),
  )
  const source = readField(initial, 'source')
  await pane.pointer({button: 'left', in: 'horizontal-scroll', type: 'down', x: 20, y: 0})
  const editor = readField(await pane.find({key: 'code-editor'}), 'props', 'props')
  expect(readField(editor, 'horizontal')).toBeGreaterThan(0)
  expect(readField(editor, 'lines', 0, 'text')).not.toContain('const alpha')
  await pane.post(
    {epoch: readNumber(readField(editor, 'epoch')), kind: 'horizontal', path: 'b.ts', value: 0},
    {in: 'horizontal-scroll'},
  )
  expect(readField(await pane.find({key: 'code-editor'}), 'props', 'props', 'horizontal')).toBe(
    readField(editor, 'horizontal'),
  )
  await pane.key({in: 'horizontal-scroll', key: 'home'})
  expect(readField(await pane.find({key: 'code-editor'}), 'props', 'props', 'horizontal')).toBe(0)
  const [document] = readArray(
    readField(fixture.stored.get('pane:/project:session-one'), 'documents'),
  )
  expect(readField(document, 'source')).toBe(source)
  expect([readField(document, 'line'), readField(document, 'column')]).toEqual([1, 1])
})

test('should use the measured source height after resizing and reveal the final document line', async (engine, on) => {
  const lineCount = 100
  const smallHeight = 4
  const expandedHeight = 8
  const fixture = projectFixture(on)
  const source = Array.from({length: lineCount}, (_, index) => `line ${index + 1}`).join('\n')
  fixture.files.set('a.ts', {revision: 'long', source})
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const pane = await engine.ui.mount(paneTarget)
  await pane.input({key: 'path', text: 'a.ts'})
  await pane.resize({columns: 40, in: 'code-editor', rows: smallHeight})
  const preferredHeight = readField(await pane.find({key: 'source-body'}), 'props', 'height')
  expect(preferredHeight).toBeGreaterThan(expandedHeight)
  expect(readField(await pane.find({key: 'code-editor'}), 'props', 'height')).toBe(preferredHeight)
  expect(readField(await pane.find({key: 'source-input'}), 'props', 'bottom')).toBe(0)
  expect(readField(await pane.find({key: 'code-editor'}), 'props', 'props', 'rows')).toBe(
    smallHeight,
  )
  await pane.key({ctrl: true, in: 'code-editor', key: 'end'})
  const editor = readField(await pane.find({key: 'code-editor'}), 'props', 'props')
  expect(readField(readArray(readField(editor, 'lines')).at(-1), 'number')).toBe(lineCount)
  await pane.resize({columns: 40, in: 'code-editor', rows: expandedHeight})
  expect(readField(await pane.find({key: 'code-editor'}), 'props', 'props', 'rows')).toBe(
    expandedHeight,
  )
  expect(readField(fixture.stored.get('pane:/project:session-one'), 'documents', 0, 'source')).toBe(
    source,
  )
})

test('should continue divider dragging across the pane after leaving its narrow handle', async (engine, on) => {
  const dragDelta = 6
  const initialWidth = 288
  const fixture = projectFixture(on)
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const pane = await engine.ui.mount({
    ...paneTarget,
    props: {...paneTarget.props, bodyColumns: 100},
  })
  await pane.input({key: 'path', text: 'a.ts'})
  const [initial] = readArray(
    readField(fixture.stored.get('pane:/project:session-one'), 'documents'),
  )
  const source = readField(initial, 'source')
  await pane.pointer({button: 'left', in: 'panel-divider:local-width', type: 'down', x: 0, y: 0})
  await pane.pointer({in: 'panel-divider:local-width', type: 'leave', x: -2, y: 0})
  await pane.pointer({
    button: 'left',
    in: 'panel-divider:local-width',
    type: 'move',
    x: -dragDelta,
    y: 2,
  })
  const width = readField(
    readField(await pane.drawn({in: 'panel-divider:local-width'}), 'props'),
    'width',
  )
  expect(width).toBeGreaterThan(initialWidth / COLUMN_PIXELS + 1)
  expect(fixture.stored.get('pane:/project:session-one:view')).toBeUndefined()
  await pane.pointer({
    button: 'left',
    in: 'panel-divider:local-width',
    type: 'up',
    x: -dragDelta,
    y: 2,
  })
  expect(
    Number.parseInt(
      readText(readField(fixture.stored.get('pane:/project:session-one:view'), 'treeWidth')),
      10,
    ),
  ).toBeGreaterThan(initialWidth)
  expect(await pane.find({key: 'resize-capture'})).toBeUndefined()
  expect(readField(fixture.stored.get('pane:/project:session-one'), 'documents', 0, 'source')).toBe(
    source,
  )
})
