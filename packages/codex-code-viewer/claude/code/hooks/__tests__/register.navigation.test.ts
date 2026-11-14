import {paneTarget, projectFixture, required} from './fixture'
import type {On} from 'claude-code'
import {expect, type Mounted, test} from 'claude-code/testing'
import {readField} from './read-field'

const SYMBOL_COLUMN = 7
const PATH_COLUMN = 27
const navigationFixture = (on: On) => {
  const fixture = projectFixture(on)
  const source = "import {greet} from './b'\ngreet('one')\n"
  fixture.files.set('a.ts', {revision: 'a1', source})
  fixture.highlights.set('a.ts', [
    [
      {kind: 'keyword', navigation: null, offset: 0, text: 'import {'},
      {kind: 'identifier', navigation: 'definition', offset: 8, text: 'greet'},
      {kind: 'plain', navigation: null, offset: 13, text: '} from '},
      {kind: 'string', navigation: 'path', offset: 20, text: "'./b'"},
    ],
    [{kind: 'identifier', navigation: 'definition', offset: 26, text: 'greet'}],
  ])
  return fixture
}
const click = async (
  pane: Mounted<'desktop', 'Pane'>,
  x: number,
  y: number,
  extra: {ctrl?: true; meta?: true} = {},
) => {
  await pane.pointer({button: 'left', in: 'code-editor', type: 'down', x, y, ...extra})
  await pane.pointer({button: 'left', in: 'code-editor', type: 'up', x, y, ...extra})
}

test('should follow an identifier or import path through a plain source click', async (engine, on) => {
  const fixture = navigationFixture(on)
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const pane = await engine.ui.mount({
    ...paneTarget,
    props: {...paneTarget.props, bodyColumns: 100},
  })
  await pane.input({key: 'path', text: 'a.ts'})
  await click(pane, SYMBOL_COLUMN, 1)
  expect(
    required(fixture.requests.filter((entry) => entry.name === 'code.navigate').at(-1)).arguments,
  ).toMatchObject({navigation: 'definition', offset: 26, path: 'a.ts'})
  expect(readField(fixture.stored.get('pane:/project:session-one'), 'active')).toBe('b.ts')
  await pane.press({key: 'back'})
  await click(pane, PATH_COLUMN, 0)
  expect(
    required(fixture.requests.filter((entry) => entry.name === 'code.navigate').at(-1)).arguments
      .navigation,
  ).toBe('path')
})

test('should retain reference results when a declaration has several usages', async (engine, on) => {
  const fixture = navigationFixture(on)
  fixture.destinations.set('a.ts:26', {
    kind: 'references',
    locations: [
      {column: 1, line: 1, path: 'b.ts', preview: 'greet(one)'},
      {column: 1, line: 2, path: 'b.ts', preview: 'greet(two)'},
    ],
  })
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const pane = await engine.ui.mount({
    ...paneTarget,
    props: {...paneTarget.props, bodyColumns: 100},
  })
  await pane.input({key: 'path', text: 'a.ts'})
  await click(pane, SYMBOL_COLUMN, 1)
  expect(await pane.find({key: 'location:0'})).toBeDefined()
  expect(await pane.find({key: 'location:1'})).toBeDefined()
  await pane.press({key: 'location:1'})
  expect(JSON.stringify(await pane.drawn())).toContain('b.ts:2:1')
})

test('should select while dragging or editing and follow an edit token only with Control', async (engine, on) => {
  const fixture = navigationFixture(on)
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const pane = await engine.ui.mount({
    ...paneTarget,
    props: {...paneTarget.props, bodyColumns: 100},
  })
  await pane.input({key: 'path', text: 'a.ts'})
  await pane.pointer({button: 'left', in: 'code-editor', type: 'down', x: 5, y: 1})
  await pane.pointer({in: 'code-editor', type: 'move', x: 10, y: 1})
  await pane.pointer({button: 'left', in: 'code-editor', type: 'up', x: 10, y: 1})
  expect(fixture.requests.filter((entry) => entry.name === 'code.navigate')).toHaveLength(0)
  await pane.press({key: 'edit'})
  await click(pane, SYMBOL_COLUMN, 1)
  expect(fixture.requests.filter((entry) => entry.name === 'code.navigate')).toHaveLength(0)
  await click(pane, SYMBOL_COLUMN, 1, {ctrl: true})
  expect(fixture.requests.filter((entry) => entry.name === 'code.navigate')).toHaveLength(1)
})
