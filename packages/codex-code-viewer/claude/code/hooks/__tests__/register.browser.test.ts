/* eslint-disable eslint-js/camelcase, id-length -- Claude tools use snake case and the literal $ API parameter. */
import {expect, test} from 'claude-code/testing'
import type {UiPane} from 'claude-code'
import {url} from './fixture'

const reply = {
  component: 'AssistantMessage' as const,
  plugin: 'code-viewer',
  props: {isFirstOfReply: true, text: '준비됐습니다.'},
  requestId: 'reply-one',
  surface: 'desktop' as const,
}
const launcher = {
  component: 'SessionMode' as const,
  plugin: 'code-viewer',
  props: {modes: []},
  requestId: 'footer',
  surface: 'desktop' as const,
}

function fixture(on) {
  const calls = []
  const contexts = ['unsaved snapshot']
  const panes: UiPane[] = []
  const tabs: {tabId: string; origin: string; isActive: boolean}[] = []
  const outcomes = {
    cwd: '/project',
    desktopConfig: JSON.stringify({locale: 'ko-KR'}) as string | undefined,
    fail: false,
    nativeFail: false,
    panes,
    tabs,
    url,
  }
  const notices = []
  const logs = []
  const reveals = []
  on('session.id', () => ({value: 'dbba577c-cad5-4c96-8f31-76d6fef6a09d'}))
  on('env.get', (_, input) => ({value: input.name === 'HOME' ? '/Users/example' : undefined}))
  on('fs.read', (_, input) => {
    expect(input.path).toBe('/Users/example/Library/Application Support/Claude/config.json')
    if (outcomes.desktopConfig === undefined) {
      throw new Error('Configuration unavailable')
    }
    return {value: outcomes.desktopConfig}
  })
  on('process.run', (_, input) => {
    reveals.push(input.argv)
    const failed = outcomes.nativeFail
    return {
      value: {
        exitCode: failed ? 1 : 0,
        stderr: failed ? '현재 Code 세션의 Browser를 펼치지 못했습니다.' : '',
        stdout: '',
      },
    }
  })
  on('session.start', () => ({cwd: '/project'}))
  on('session.cwd', () => ({value: outcomes.cwd}))
  on('ui.panes', () => ({value: outcomes.panes}))
  on('ui.close', (_, input) => {
    calls.push(input)
    return {value: undefined}
  })
  on('session.surfaces', () => ({value: []}))
  on('session.attach', (_, input) => ({clientId: input.clientId}))
  on('mcp.connect', () => ({value: {isConnected: true, server: 'plugin:code-viewer:viewer'}}))
  on('mcp.call', (_, input) => {
    calls.push(input)
    return {
      value: outcomes.fail
        ? {content: [], isError: true}
        : input.tool === 'code.attachments'
          ? {content: contexts.map((text) => ({text, type: 'text'}))}
          : {
              content: [],
              structuredContent: {session: 'one', url: outcomes.url, workspace: '/project'},
            },
    }
  })
  on('tool.call', (_, input) => {
    calls.push(input)
    if (input.tool === 'mcp__Claude_Browser__tabs_context') {
      const notice =
        tabs.length > 0
          ? 'The Browser pane is currently displayed.'
          : 'The Browser pane isn\'t open yet, so there are no tabs. Call preview_start or navigate with {"url": "https://…"} to open it.'
      return {
        result: [
          {
            text: `${JSON.stringify({browserOpen: tabs.length > 0, tabs})}\n${notice}`,
            type: 'text',
          },
        ],
      }
    }
    if (input.tool === 'mcp__Claude_Browser__preview_start' && !outcomes.fail) {
      tabs.splice(0, tabs.length, {
        isActive: true,
        origin: new URL(outcomes.url).origin,
        tabId: 'viewer',
      })
    }
    if (input.tool === 'mcp__Claude_Browser__tabs_select') {
      tabs.forEach((tab) => {
        tab.isActive = tab.tabId === input.tabId
      })
      return {result: 'Fronted tab viewer.'}
    }
    return input.tool === 'Read'
      ? {result: {file: {filePath: input.file_path, startLine: input.offset ?? 1}, type: 'text'}}
      : {
          isError: outcomes.fail,
          result: JSON.stringify({
            capabilities: {reveal: true},
            session: 'one',
            url: outcomes.url,
            workspace: '/project',
          }),
        }
  })
  on('ui.open', (_, input) => {
    calls.push(input)
    return {value: undefined}
  })
  on('ui.log', (_, input) => {
    logs.push(input.text)
    return {value: undefined}
  })
  on('ui.toast', (_, input) => {
    notices.push(input.text)
    return {value: undefined}
  })
  on('ui.render', ($, event) =>
    $.ui.resolve(event).Text({children: [event.props.text ?? 'original']}),
  )
  on('prompt.submit', (_, event) => ({context: event.context ?? [], text: event.text}))
  return {calls, contexts, logs, notices, outcomes, reveals}
}

test('should reveal the Browser for repeated explicit clicks without reloading its active tab', async (engine, on) => {
  const {calls, outcomes, reveals} = fixture(on)
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  outcomes.tabs.push({isActive: true, origin: new URL(url).origin, tabId: 'retained'})
  const drawing = await engine.ui.mount(launcher)
  await drawing.press({key: 'code-viewer:open'})
  await drawing.press({key: 'code-viewer:open'})
  expect(reveals).toHaveLength(2)
  expect(reveals[0]).toEqual([
    expect.stringContaining('/runtime/node'),
    expect.stringContaining('/dist/reveal.js'),
    'dbba577c-cad5-4c96-8f31-76d6fef6a09d',
    url,
  ])
  expect(calls.filter((call) => call.tool === 'mcp__Claude_Browser__preview_start')).toEqual([])
  expect(calls.filter((call) => call.tool === 'mcp__Claude_Browser__navigate')).toEqual([])
})

test('should reveal clicked links while keeping automatic following in the background', async (engine, on) => {
  const {reveals} = fixture(on)
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  expect(reveals).toEqual([])
  const drawing = await engine.ui.mount({
    ...reply,
    props: {isFirstOfReply: true, text: '[코드](a.ts:7:3)'},
  })
  await drawing.press({key: 'code-viewer:links', link: {href: 'file:///project/a.ts#L7C3'}})
  expect(reveals).toHaveLength(1)
  await engine.tool.call({file_path: '/project/b.ts', offset: 20, tool: 'Read'})
  expect(reveals).toHaveLength(1)
})

test('should report a native reveal failure without reloading or consuming retained snapshots', async (engine, on) => {
  const {calls, contexts, notices, outcomes} = fixture(on)
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  outcomes.tabs.push({isActive: true, origin: new URL(url).origin, tabId: 'retained'})
  outcomes.nativeFail = true
  const drawing = await engine.ui.mount(launcher)
  await drawing.press({key: 'code-viewer:open'})
  expect(notices).toEqual(['Code Viewer: 현재 Code 세션의 Browser를 펼치지 못했습니다.'])
  expect(contexts).toEqual(['unsaved snapshot'])
  expect(calls.filter((call) => call.tool === 'mcp__Claude_Browser__preview_start')).toEqual([])
  expect(calls.filter((call) => call.tool === 'mcp__Claude_Browser__navigate')).toEqual([])
})

test('should start and attach without opening a viewer or connecting MCP', async (engine, on) => {
  const {calls} = fixture(on)
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  await engine.session.attach({clientId: 'desktop', surface: 'desktop'})
  expect(calls).toEqual([])
})

test('should open the retained viewer without replacing its location with the latest read', async (engine, on) => {
  const {calls} = fixture(on)
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  await engine.tool.call({file_path: '/project/example.ts', offset: 12, tool: 'Read'})
  expect(calls).toHaveLength(1)
  const drawing = await engine.ui.mount(launcher)
  await drawing.press({key: 'code-viewer:open'})
  const opened = calls.filter(
    (call) => call.tool === 'mcp__plugin_code-viewer_viewer__code_browser',
  )
  expect(opened).toHaveLength(1)
  expect(opened[0]).not.toHaveProperty('path')
  expect(opened[0]).not.toHaveProperty('line')
  expect(opened[0]).not.toHaveProperty('column')
  expect(calls.filter((call) => call.tool === 'mcp__Claude_Browser__preview_start')).toHaveLength(1)
})

test('should open a clicked project file link at its line and preserve external links', async (engine, on) => {
  const {calls} = fixture(on)
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const target = {
    ...reply,
    props: {isFirstOfReply: true, text: '[코드](/project/a.ts:7:3) [문서](https://example.com/)'},
  }
  const drawing = await engine.ui.mount(target)
  const markdown = await drawing.find({type: 'Markdown'})
  expect(markdown.props.pressableLinks).toEqual(['file:///project/a.ts#L7C3'])
  await drawing.press({key: 'code-viewer:links', link: {href: 'file:///project/a.ts#L7C3'}})
  expect(
    calls.find((call) => call.tool === 'mcp__plugin_code-viewer_viewer__code_browser'),
  ).toMatchObject({
    column: 3,
    line: 7,
    path: '/project/a.ts',
  })
})

test('should follow in place without another Browser navigation after opening', async (engine, on) => {
  const {calls} = fixture(on)
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const drawing = await engine.ui.mount(launcher)
  await drawing.press({key: 'code-viewer:open'})
  await engine.tool.call({file_path: '/project/b.ts', offset: 20, tool: 'Read'})
  expect(calls.filter((call) => call.tool === 'mcp__Claude_Browser__preview_start')).toHaveLength(1)
  expect(
    calls.filter((call) => call.tool === 'mcp__plugin_code-viewer_viewer__code_browser').at(-1),
  ).toMatchObject({
    column: 1,
    line: 20,
    path: '/project/b.ts',
  })
})

test('should ignore attachment export reads and preserve the last project location', async (engine, on) => {
  const {calls} = fixture(on)
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  await engine.tool.call({file_path: '/project/main.ts', tool: 'Read'})
  const drawing = await engine.ui.mount(launcher)
  await drawing.press({key: 'code-viewer:open'})
  const opened = calls.filter(
    (call) => call.tool === 'mcp__plugin_code-viewer_viewer__code_browser',
  ).length
  await engine.tool.call({file_path: '/private/tmp/code-viewer-context.txt', tool: 'Read'})
  expect(
    calls.filter((call) => call.tool === 'mcp__plugin_code-viewer_viewer__code_browser'),
  ).toHaveLength(opened)
  await drawing.press({key: 'code-viewer:open'})
  expect(
    calls.filter((call) => call.tool === 'mcp__plugin_code-viewer_viewer__code_browser').at(-1),
  ).not.toHaveProperty('path')
})

test('should deliver retained Browser snapshots with composer input intact', async (engine, on) => {
  const {calls} = fixture(on)
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const drawing = await engine.ui.mount(launcher)
  await drawing.press({key: 'code-viewer:open'})
  const input = {context: ['existing'], origin: {kind: 'composer'} as const, text: '첨부 설명'}
  expect(await engine.prompt.submit(input)).toEqual({
    context: ['existing', 'unsaved snapshot'],
    text: input.text,
  })
  expect(calls.filter((call) => call.tool === 'code.attachments')).toHaveLength(1)
})

test('should retain live snapshots across sends and respect removals', async (engine, on) => {
  const {contexts} = fixture(on)
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const drawing = await engine.ui.mount(launcher)
  await drawing.press({key: 'code-viewer:open'})
  const input = {origin: {kind: 'composer'} as const, text: '설명'}
  expect((await engine.prompt.submit(input)).context).toEqual(['unsaved snapshot'])
  expect((await engine.prompt.submit(input)).context).toEqual(['unsaved snapshot'])
  contexts.splice(0)
  expect((await engine.prompt.submit(input)).context).toEqual([])
})

test('should leave unopened sessions independent of the attachment server', async (engine, on) => {
  const {calls} = fixture(on)
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const input = {origin: {kind: 'composer'} as const, text: 'hello'}
  expect(await engine.prompt.submit(input)).toEqual({context: [], text: 'hello'})
  expect(calls).toEqual([])
})

test('should refuse sending an incomplete attachment when its server fails', async (engine, on) => {
  const {outcomes} = fixture(on)
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const drawing = await engine.ui.mount(launcher)
  await drawing.press({key: 'code-viewer:open'})
  outcomes.fail = true
  const result = await engine.prompt.submit({origin: {kind: 'composer'}, text: '첨부 설명'})
  expect(result.drop).toContain('첨부')
})

test('should open the command locally without asking the model to run setup', async (engine, on) => {
  const {calls} = fixture(on)
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  expect(await engine.command.run({args: '', command: 'code-viewer:open'})).toEqual({})
  expect(calls.filter((call) => call.tool === 'mcp__Claude_Browser__preview_start')).toHaveLength(1)
})

test('should keep CLI messages and prompts unchanged', async (engine, on) => {
  const {calls} = fixture(on)
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'cli'})
  const result = await engine.ui.render({...reply, surface: 'terminal'})
  expect(JSON.stringify(result)).not.toContain('code-viewer:open')
  const input = {origin: {kind: 'composer'} as const, text: 'hello'}
  expect(await engine.prompt.submit(input)).toEqual({context: [], text: 'hello'})
  expect(calls).toEqual([])
})

test('should preserve a completed read when in-place following fails', async (engine, on) => {
  const {calls, outcomes} = fixture(on)
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const drawing = await engine.ui.mount(launcher)
  await drawing.press({key: 'code-viewer:open'})
  outcomes.fail = true
  const result = await engine.tool.call({file_path: '/project/a.ts', tool: 'Read'})
  expect(result.result).toEqual({file: {filePath: '/project/a.ts', startLine: 1}, type: 'text'})
  expect(calls.filter((call) => call.tool === 'mcp__Claude_Browser__preview_start')).toHaveLength(1)
})

test('should refuse an unexpected URL without navigating the Browser', async (engine, on) => {
  const {calls, notices, outcomes} = fixture(on)
  outcomes.url = 'https://example.com/'
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const drawing = await engine.ui.mount(launcher)
  await drawing.press({key: 'code-viewer:open'})
  expect(calls.filter((call) => call.tool === 'mcp__Claude_Browser__preview_start')).toEqual([])
  expect(notices).toHaveLength(1)
})

test('should expose an open button in the Desktop session footer without opening a pane', async (engine, on) => {
  const {calls} = fixture(on)
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const footer = await engine.ui.mount({
    component: 'SessionMode',
    plugin: 'code-viewer',
    props: {modes: []},
    requestId: 'footer',
    surface: 'desktop',
  })
  expect((await footer.find({key: 'code-viewer:open'})).text).toBe('코드 뷰어 열기')
  expect(calls).toEqual([])
})

for (const {config, name, text} of [
  {config: '{"locale":"en-US"}', name: 'English app locale', text: 'Open Code Viewer'},
  {config: '{"locale":"ko_KR"}', name: 'Korean locale variant', text: '코드 뷰어 열기'},
  {config: '{"locale":"ja-JP"}', name: 'Japanese app locale', text: 'コードビューアーを開く'},
  {config: '{"locale":"zh-CN"}', name: 'Simplified Chinese app locale', text: '打开代码查看器'},
  {
    config: '{"locale":"zh-CN-x-tw"}',
    name: 'Simplified Chinese private-use locale',
    text: '打开代码查看器',
  },
  {config: '{"locale":"es-MX"}', name: 'Spanish app locale', text: 'Abrir visor de código'},
  {config: '{"locale":"zh-TW"}', name: 'Traditional Chinese app locale', text: 'Open Code Viewer'},
  {config: '{"locale":"fr-FR"}', name: 'unsupported app locale', text: 'Open Code Viewer'},
  {
    config: '{}',
    name: 'no app language selection',
    text: 'Open Code Viewer',
  },
  {
    config: undefined,
    name: 'missing app configuration',
    text: 'Open Code Viewer',
  },
  {config: '{invalid', name: 'malformed app configuration', text: 'Open Code Viewer'},
  {config: '{"locale":42}', name: 'invalid locale value', text: 'Open Code Viewer'},
  {config: '{"locale":""}', name: 'empty locale value', text: 'Open Code Viewer'},
  {config: 'null', name: 'unavailable language', text: 'Open Code Viewer'},
]) {
  test(`should translate the open button for ${name}`, async (engine, on) => {
    const {outcomes} = fixture(on)
    outcomes.desktopConfig = config
    await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
    const footer = await engine.ui.mount(launcher)
    expect((await footer.find({key: 'code-viewer:open'})).text).toBe(text)
  })
}

test('should update the button after the app language changes and the footer redraws', async (engine, on) => {
  const {outcomes} = fixture(on)
  const footer = await engine.ui.mount(launcher)
  expect((await footer.find({key: 'code-viewer:open'})).text).toBe('코드 뷰어 열기')
  outcomes.desktopConfig = '{"locale":"en-US"}'
  await footer.redraw()
  expect((await footer.find({key: 'code-viewer:open'})).text).toBe('Open Code Viewer')
})

test('should omit configuration contents from language diagnostic logs', async (engine, on) => {
  const {logs, outcomes} = fixture(on)
  outcomes.desktopConfig = '{"locale":"en-US","oauth:tokenCache":SYNTHETIC_PRIVATE_TOKEN}'
  const footer = await engine.ui.mount(launcher)
  expect((await footer.find({key: 'code-viewer:open'})).text).toBe('Open Code Viewer')
  expect(logs).toHaveLength(1)
  expect(logs[0]).not.toContain('SYNTHETIC')
  expect(logs[0]).not.toContain('tokenCache')
})

test('should translate opening errors in English', async (engine, on) => {
  const {notices, outcomes} = fixture(on)
  outcomes.desktopConfig = '{"locale":"en-US"}'
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const footer = await engine.ui.mount(launcher)
  outcomes.url = 'https://example.com/'
  await footer.press({key: 'code-viewer:open'})
  expect(notices).toEqual(['Code Viewer: The viewer URL is not an authenticated local address.'])
})

test('should translate attachment errors in English', async (engine, on) => {
  const {notices, outcomes} = fixture(on)
  outcomes.desktopConfig = '{"locale":"en-US"}'
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const footer = await engine.ui.mount(launcher)
  await footer.press({key: 'code-viewer:open'})
  outcomes.fail = true
  const result = await engine.prompt.submit({origin: {kind: 'composer'}, text: 'Explain this'})
  expect(result.drop).toBe('Could not retrieve Code Viewer attachments. Please send again.')
  expect(notices).toEqual(['Code Viewer: Could not retrieve attachments.'])
})

test('should close the previous native Pane without opening another screen', async (engine, on) => {
  const {calls, outcomes} = fixture(on)
  outcomes.panes.push({
    id: 'code-viewer-pane',
    isFocused: false,
    isPlaced: true,
    isShown: true,
    title: 'Code Viewer Pane',
  })
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  expect(calls).toEqual([{id: 'code-viewer-pane', origin: {kind: 'plugin'}}])
})

test('should open the current worktree after session startup changes the working directory', async (engine, on) => {
  const {calls, outcomes} = fixture(on)
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  outcomes.cwd = '/project-worktree'
  const drawing = await engine.ui.mount(launcher)
  await drawing.press({key: 'code-viewer:open'})
  expect(
    calls.find((call) => call.tool === 'mcp__plugin_code-viewer_viewer__code_browser'),
  ).toMatchObject({workspace: '/project-worktree'})
})

test('should route links from the changed worktree through the viewer', async (engine, on) => {
  const {calls, outcomes} = fixture(on)
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  outcomes.cwd = '/project-worktree'
  const drawing = await engine.ui.mount({
    ...reply,
    props: {isFirstOfReply: true, text: '[코드](a.ts:7:3)'},
  })
  expect((await drawing.find({type: 'Markdown'})).props.pressableLinks).toEqual([
    'file:///project-worktree/a.ts#L7C3',
  ])
  await drawing.press({
    key: 'code-viewer:links',
    link: {href: 'file:///project-worktree/a.ts#L7C3'},
  })
  expect(
    calls.find((call) => call.tool === 'mcp__plugin_code-viewer_viewer__code_browser'),
  ).toMatchObject({
    column: 3,
    line: 7,
    path: '/project-worktree/a.ts',
    workspace: '/project-worktree',
  })
})

test('should reopen the viewer after its Browser tab was closed', async (engine, on) => {
  const {calls, outcomes} = fixture(on)
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const drawing = await engine.ui.mount(launcher)
  await drawing.press({key: 'code-viewer:open'})
  outcomes.tabs.splice(0)
  await drawing.press({key: 'code-viewer:open'})
  expect(calls.filter((call) => call.tool === 'mcp__Claude_Browser__preview_start')).toHaveLength(2)
})

test('should reopen a clicked file link after its Browser tab was closed', async (engine, on) => {
  const {calls, outcomes} = fixture(on)
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const drawing = await engine.ui.mount({
    ...reply,
    props: {isFirstOfReply: true, text: '[코드](/project/a.ts:7:3)'},
  })
  const link = {key: 'code-viewer:links', link: {href: 'file:///project/a.ts#L7C3'}}
  await drawing.press(link)
  outcomes.tabs.splice(0)
  await drawing.press(link)
  expect(calls.filter((call) => call.tool === 'mcp__Claude_Browser__preview_start')).toHaveLength(2)
})

test('should select an existing viewer tab without reloading its drafts', async (engine, on) => {
  const {calls, outcomes} = fixture(on)
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const drawing = await engine.ui.mount(launcher)
  await drawing.press({key: 'code-viewer:open'})
  outcomes.tabs[0].isActive = false
  outcomes.tabs.push({isActive: true, origin: 'https://example.com', tabId: 'other'})
  await drawing.press({key: 'code-viewer:open'})
  expect(calls.filter((call) => call.tool === 'mcp__Claude_Browser__preview_start')).toHaveLength(1)
  expect(calls.find((call) => call.tool === 'mcp__Claude_Browser__tabs_select')).toMatchObject({
    tabId: 'viewer',
  })
})

test('should reuse a viewer already open before this hook starts', async (engine, on) => {
  const {calls, outcomes} = fixture(on)
  outcomes.tabs.push({isActive: true, origin: new URL(url).origin, tabId: 'existing-viewer'})
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const drawing = await engine.ui.mount(launcher)
  await drawing.press({key: 'code-viewer:open'})
  await drawing.press({key: 'code-viewer:open'})
  expect(calls.filter((call) => call.tool === 'mcp__Claude_Browser__tabs_context')).toHaveLength(2)
  expect(calls.filter((call) => call.tool === 'mcp__Claude_Browser__preview_start')).toEqual([])
  expect(calls.filter((call) => call.tool === 'mcp__Claude_Browser__navigate')).toEqual([])
  expect(calls.filter((call) => call.tool === 'mcp__Claude_Browser__tabs_select')).toEqual([])
})

test('should reopen without replaying a tracked file or position after its tab closes', async (engine, on) => {
  const {calls, outcomes} = fixture(on)
  await engine.session.start({cwd: '/project', isInteractive: false, surface: 'desktop'})
  const drawing = await engine.ui.mount(launcher)
  await drawing.press({key: 'code-viewer:open'})
  await engine.tool.call({file_path: '/project/agent.ts', offset: 17, tool: 'Read'})
  outcomes.tabs.splice(0)
  await drawing.press({key: 'code-viewer:open'})
  const reopened = calls
    .filter((call) => call.tool === 'mcp__plugin_code-viewer_viewer__code_browser')
    .at(-1)
  expect(reopened).not.toHaveProperty('path')
  expect(reopened).not.toHaveProperty('line')
  expect(reopened).not.toHaveProperty('column')
  expect(calls.filter((call) => call.tool === 'mcp__Claude_Browser__preview_start')).toHaveLength(2)
})
