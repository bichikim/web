/* eslint-disable eslint-js/camelcase -- Claude built-in tool arguments use snake case. */
import {expect, test} from 'claude-code/testing'

import {url} from './fixture'

test('should render the native file opening controls in its pane', async (engine) => {
  const tree = await engine.ui.render({
    component: 'Pane',
    props: {
      bodyColumns: 60,
      isFocused: false,
      placement: 'dock',
      scroll: {bodyRows: 30, offset: 0},
      title: 'Code Viewer Pane',
      view: {},
    },
    requestId: 'code-viewer-pane',
    surface: 'desktop',
  })
  expect(JSON.stringify(tree)).toContain('파일 경로 또는 검색어')
  expect(JSON.stringify(tree)).toContain('검색')
})

test('should preserve another Desktop pane rendering', async (engine, on) => {
  on('ui.render', (_engine, event) => _engine.ui.resolve(event).Text({children: ['Other pane']}))
  const tree = await engine.ui.render({
    component: 'Pane',
    props: {
      bodyColumns: 60,
      isFocused: false,
      placement: 'dock',
      scroll: {bodyRows: 30, offset: 0},
      title: 'Other pane',
      view: {},
    },
    requestId: 'other-pane',
    surface: 'desktop',
  })
  expect(JSON.stringify(tree)).toContain('Other pane')
})

test('should open a Desktop pane even when the Browser connection fails', async (engine, on) => {
  const panes: unknown[] = []
  on('session.start', () => ({cwd: '/project'}))
  on('mcp.connect', () => ({deny: 'connection unavailable'}))
  on('ui.open', (_, input) => {
    panes.push(input)
    return {value: undefined}
  })
  on('ui.toast', () => ({value: undefined}))
  on('ui.log', () => ({value: undefined}))
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  expect(panes).toEqual([{columns: 100, id: 'code-viewer-pane', title: 'Code Viewer Pane'}])
})

test('should wait for Desktop before opening the dedicated pane', async (engine, on) => {
  const panes: unknown[] = []
  on('session.start', () => ({cwd: '/project'}))
  on('session.attach', (_, input) => ({clientId: input.clientId}))
  on('session.surfaces', () => ({value: []}))
  on('mcp.connect', () => ({deny: 'connection unavailable'}))
  on('ui.open', (_, input) => {
    panes.push(input)
    return {value: undefined}
  })
  on('ui.toast', () => ({value: undefined}))
  on('ui.log', () => ({value: undefined}))
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'cli'})
  expect(panes).toEqual([])
  await engine.session.attach({clientId: 'desktop', surface: 'desktop'})
  expect(panes).toEqual([{columns: 100, id: 'code-viewer-pane', title: 'Code Viewer Pane'}])
})

test('should preserve Browser startup when the dedicated pane cannot open', async (engine, on) => {
  const calls: unknown[] = []
  on('session.start', () => ({cwd: '/project'}))
  on('ui.open', () => ({deny: 'pane unavailable'}))
  on('ui.log', () => ({value: undefined}))
  on('mcp.connect', () => ({value: {isConnected: true, server: 'plugin:code-viewer:viewer'}}))
  on('tool.call', (_, input) => {
    calls.push(input.tool)
    return {result: JSON.stringify({url})}
  })
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  expect(calls).toEqual([
    'mcp__plugin_code-viewer_viewer__code_browser',
    'mcp__Claude_Browser__navigate',
  ])
})

test('should add explanation guidance without removing existing prompt context', async (engine, on) => {
  on('session.start', () => ({cwd: '/project'}))
  on('mcp.connect', () => ({value: {isConnected: true, server: 'plugin:code-viewer:viewer'}}))
  on('tool.call', () => ({result: JSON.stringify({url})}))
  on('prompt.context', () => ({blocks: [{name: 'existing', text: 'Project guidance'}]}))
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const context = await engine.prompt.context({blocks: []})
  expect(context.blocks[0]).toEqual({name: 'existing', text: 'Project guidance'})
  expect(context.blocks[1].text).toContain('explaining or modifying project code')
  expect(context.blocks[1].text).toContain('code.browser')
  expect(context.blocks[1].text).toContain('unsaved drafts')
})

test('should follow a completed read in place and preserve its tool result', async (engine, on) => {
  const calls: unknown[] = []
  const outcome = {result: {file: {filePath: '/project/example.ts', startLine: 12}, type: 'text'}}
  on('session.start', () => ({cwd: '/project'}))
  on('mcp.connect', () => ({value: {isConnected: true, server: 'plugin:code-viewer:viewer'}}))
  on('tool.call', (_, input) => (input.tool === 'Read' ? outcome : {result: JSON.stringify({url})}))
  on('mcp.call', (_, input) => {
    calls.push(input)
    return {value: {content: [], isError: false}}
  })
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  expect(
    await engine.tool.call({file_path: '/project/example.ts', offset: 12, tool: 'Read'}),
  ).toEqual(outcome)
  expect(calls).toEqual([
    {
      args: {column: 1, line: 12, path: '/project/example.ts'},
      server: 'plugin:code-viewer:viewer',
      tool: 'code.browser',
    },
  ])
})

test('should preserve a completed edit if viewer following fails', async (engine, on) => {
  const outcome = {
    result: {
      filePath: '/project/example.ts',
      structuredPatch: [{lines: [' context', '-before', '+after'], newStart: 6}],
    },
  }
  const calls: unknown[] = []
  on('session.start', () => ({cwd: '/project'}))
  on('mcp.connect', () => ({value: {isConnected: true, server: 'plugin:code-viewer:viewer'}}))
  on('tool.call', (_, input) => (input.tool === 'Edit' ? outcome : {result: JSON.stringify({url})}))
  on('mcp.call', (_, input) => {
    calls.push(input.args)
    return {value: {content: [], isError: true}}
  })
  on('ui.log', () => ({value: undefined}))
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  expect(
    await engine.tool.call({
      file_path: '/project/example.ts',
      new_string: 'after',
      old_string: 'before',
      tool: 'Edit',
    }),
  ).toEqual(outcome)
  expect(calls).toEqual([{column: 1, line: 7, path: '/project/example.ts'}])
})

test('should leave CLI prompt context and reads unchanged', async (engine, on) => {
  const context = {blocks: [{name: 'existing', text: 'CLI guidance'}]}
  const calls: unknown[] = []
  on('session.start', () => ({cwd: '/project'}))
  on('session.surfaces', () => ({value: []}))
  on('prompt.context', () => context)
  on('tool.call', () => ({
    result: {file: {filePath: '/project/example.ts', startLine: 1}, type: 'text'},
  }))
  on('mcp.call', (_, input) => {
    calls.push(input)
    return {value: {content: [], isError: false}}
  })
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'cli'})
  expect(await engine.prompt.context({blocks: []})).toEqual(context)
  await engine.tool.call({file_path: '/project/example.ts', tool: 'Read'})
  expect(calls).toEqual([])
})

test('should open the project viewer on Desktop startup without submitting a prompt', async (engine, on) => {
  const calls: unknown[] = []
  on('session.start', () => ({cwd: '/project'}))
  on('session.attach', (_, input) => ({clientId: input.clientId}))
  on('mcp.connect', (_, input) => {
    calls.push(input)
    return {value: {isConnected: true, server: 'plugin:code-viewer:viewer'}}
  })
  on('tool.call', (_, input) => {
    calls.push({tool: input.tool, ...(input.url === undefined ? {} : {url: input.url})})
    return {result: JSON.stringify({url})}
  })
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  await engine.session.attach({clientId: 'desktop', surface: 'desktop'})
  expect(calls).toEqual([
    {server: 'viewer'},
    {tool: 'mcp__plugin_code-viewer_viewer__code_browser'},
    {tool: 'mcp__Claude_Browser__navigate', url},
  ])
})

test('should wait for a Desktop attachment when the session starts without a surface', async (engine, on) => {
  const calls: unknown[] = []
  on('session.start', () => ({cwd: '/project'}))
  on('session.attach', (_, input) => ({clientId: input.clientId}))
  on('session.surfaces', () => ({value: []}))
  on('mcp.connect', () => ({value: {isConnected: true, server: 'plugin:code-viewer:viewer'}}))
  on('tool.call', (_, input) => {
    calls.push({tool: input.tool, ...(input.url === undefined ? {} : {url: input.url})})
    return {result: JSON.stringify({url})}
  })
  await engine.session.start({cwd: '/project', isInteractive: false, surface: null})
  expect(calls).toEqual([])
  await engine.session.attach({clientId: 'desktop', surface: 'desktop'})
  expect(calls).toHaveLength(2)
})

test('should report a failed connection without stopping the session or opening a substitute', async (engine, on) => {
  const notices: unknown[] = []
  on('session.start', () => ({cwd: '/project'}))
  on('mcp.connect', () => ({deny: 'connection unavailable'}))
  on('ui.toast', (_, input) => {
    notices.push(input)
    return {value: undefined}
  })
  on('ui.log', () => ({value: undefined}))
  expect(
    await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'}),
  ).toEqual({cwd: '/project'})
  expect(notices).toHaveLength(1)
})

test('should refuse an unexpected viewer URL before sending it to the Browser', async (engine, on) => {
  const calls: unknown[] = []
  const notices: unknown[] = []
  on('session.start', () => ({cwd: '/project'}))
  on('mcp.connect', () => ({value: {isConnected: true, server: 'plugin:code-viewer:viewer'}}))
  on('tool.call', (_, input) => {
    calls.push({tool: input.tool})
    return {result: JSON.stringify({url: 'https://example.com/'})}
  })
  on('ui.toast', (_, input) => {
    notices.push(input)
    return {value: undefined}
  })
  on('ui.log', () => ({value: undefined}))
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  expect(calls).toEqual([{tool: 'mcp__plugin_code-viewer_viewer__code_browser'}])
  expect(notices).toHaveLength(1)
})

test('should retry after a failed open when a Desktop client reconnects', async (engine, on) => {
  let connections = 0
  const calls: unknown[] = []
  on('session.start', () => ({cwd: '/project'}))
  on('session.attach', (_, input) => ({clientId: input.clientId}))
  on('mcp.connect', () => {
    connections += 1
    return connections === 1
      ? {value: {isConnected: false, message: 'connection unavailable', reason: 'failed'}}
      : {value: {isConnected: true, server: 'plugin:code-viewer:viewer'}}
  })
  on('tool.call', (_, input) => {
    calls.push({tool: input.tool, ...(input.url === undefined ? {} : {url: input.url})})
    return {result: JSON.stringify({url})}
  })
  on('ui.toast', () => ({value: undefined}))
  on('ui.log', () => ({value: undefined}))
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  await engine.session.attach({clientId: 'desktop', surface: 'desktop'})
  expect(connections).toBe(2)
  expect(calls).toHaveLength(2)
})

test('should refuse a loopback URL without the viewer authentication token', async (engine, on) => {
  const calls: unknown[] = []
  const notices: unknown[] = []
  on('session.start', () => ({cwd: '/project'}))
  on('mcp.connect', () => ({value: {isConnected: true, server: 'plugin:code-viewer:viewer'}}))
  on('tool.call', (_, input) => {
    calls.push(input.tool)
    return {result: JSON.stringify({url: 'http://127.0.0.1:54321/#anything'})}
  })
  on('ui.toast', (_, input) => {
    notices.push(input.text)
    return {value: undefined}
  })
  on('ui.log', () => ({value: undefined}))
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  expect(calls).toEqual(['mcp__plugin_code-viewer_viewer__code_browser'])
  expect(notices).toEqual([
    'Code Viewer: Code Viewer did not return an authenticated loopback URL.',
  ])
})

test('should preserve a tool permission denial and leave the Browser unopened', async (engine, on) => {
  const notices: unknown[] = []
  const calls: unknown[] = []
  on('session.start', () => ({cwd: '/project'}))
  on('mcp.connect', () => ({value: {isConnected: true, server: 'plugin:code-viewer:viewer'}}))
  on('tool.call', (_, input) => {
    calls.push(input.tool)
    return {deny: 'startup classifier gave no verdict'}
  })
  on('ui.toast', (_, input) => {
    notices.push(input.text)
    return {value: undefined}
  })
  on('ui.log', () => ({value: undefined}))
  expect(
    await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'}),
  ).toEqual({cwd: '/project'})
  expect(calls).toEqual(['mcp__plugin_code-viewer_viewer__code_browser'])
  expect(notices).toHaveLength(1)
  expect(notices[0]).toContain('startup classifier gave no verdict')
})
