/* eslint-disable id-length -- Claude Mods validates the literal $ API parameter. */
import {canApproveOpen} from './can-approve-open.ts'
import {readToolLocation} from './read-tool-location.ts'
import {readFileLinks} from './read-file-links.ts'
import {readBrowserTab} from './read-browser-tab.ts'
import {isProjectFile} from './is-project-file.ts'
import {readBrowserMessages} from './read-browser-messages.ts'

const MAX_MARKDOWN_CHARS = 10000
const MAX_FILE_LINKS = 256
let desktop = false
let workspace = ''
let browser
let operations = Promise.resolve()
let text = readBrowserMessages(undefined)
const messages = new Map()
/** @type {import('./can-approve-open.ts').OpenPhase} */
let phase = {kind: 'idle'}

const guidance = [
  'Code Viewer uses the original web editor in the Browser panel.',
  'Do not open or navigate the viewer automatically when a session starts or when reading or editing files.',
  'The Mod tracks successful main-conversation Read/Edit/Write calls and updates an already opened viewer.',
  'Use clickable Markdown links for project file references, including a 1-based line when relevant.',
  'The user can click a file link or the Code Viewer open button to open it on demand.',
  'If explicitly asked to open the viewer, use code.browser with the requested path and line.',
  'An open viewer updates in place. Do not reload it; preserve unsaved drafts and attachments.',
  'The original Browser stages user-selected attachment snapshots in code.attachments.',
  'User-selected Browser attachments are included with composer messages as retained snapshots.',
  'Use code.attachments to inspect those snapshots again when needed.',
  'It takes no session argument. Do not call another extension’s code.panel to read Browser attachments.',
  'Read the attached snapshots, including unsaved changes; disk content is not a substitute.',
].join(' ')

async function refreshMessages($) {
  let locale
  try {
    const home = await $.env.get('HOME')
    if (home !== undefined) {
      const config = JSON.parse(
        await $.fs.read(`${home}/Library/Application Support/Claude/config.json`),
      )
      const {locale: configured} = config ?? {}
      if (typeof configured === 'string' && configured.trim() !== '') {
        locale = configured
      }
    }
  } catch {
    $.ui.log('Code Viewer language settings are unavailable; using English.', {to: 'debug'})
  }
  text = readBrowserMessages(locale)
}

function enqueue($, action) {
  const next = operations.then(action)
  operations = next.catch((error) => {
    $.ui.log(`Code Viewer: ${error instanceof Error ? error.message : String(error)}`, {
      to: 'debug',
    })
  })
  return next
}

async function viewerLocation($, location) {
  const directory = await $.session.cwd()
  const connection = await $.mcp.connect('viewer')
  if (!connection.isConnected) {
    throw new Error(connection.message)
  }
  phase =
    location === undefined
      ? {kind: 'viewer', workspace: directory}
      : {kind: 'follow', location: {...location, workspace: directory}}
  try {
    const response = await $.tool.call({
      tool: 'mcp__plugin_code-viewer_viewer__code_browser',
      ...location,
      workspace: directory,
    })
    if (response.isError || response.deny !== undefined) {
      throw new Error(response.deny ?? response.text ?? text.fileError)
    }
    const value =
      typeof response.result === 'string' ? JSON.parse(response.result) : response.result
    if (typeof value?.url !== 'string') {
      throw new Error(text.urlError)
    }
    const address = new URL(value.url)
    const token = new URLSearchParams(address.hash.slice(1)).get('token')
    if (
      address.protocol !== 'http:' ||
      address.hostname !== '127.0.0.1' ||
      !/^[a-f0-9]{64}$/u.test(token ?? '')
    ) {
      throw new Error(text.urlInvalid)
    }
    return value
  } finally {
    phase = {kind: 'idle'}
  }
}

async function presentViewer($, value, isUserClick) {
  const context = await $.tool.call({tool: 'mcp__Claude_Browser__tabs_context'})
  if (context.isError || context.deny !== undefined) {
    throw new Error(context.deny ?? text.browserTabsError)
  }
  const tab = readBrowserTab(context.result, value.url)
  if (tab === undefined) {
    phase = isUserClick ? {kind: 'reopen', url: value.url} : {kind: 'idle'}
    try {
      const result = await $.tool.call({tool: 'mcp__Claude_Browser__preview_start', url: value.url})
      if (result.isError || result.deny !== undefined) {
        throw new Error(result.deny ?? text.browserError)
      }
    } finally {
      phase = {kind: 'idle'}
    }
  } else if (!tab.isActive) {
    const result = await $.tool.call({tabId: tab.tabId, tool: 'mcp__Claude_Browser__tabs_select'})
    if (result.isError || result.deny !== undefined) {
      throw new Error(result.deny ?? text.selectError)
    }
  }
  if (isUserClick) {
    // Existing MCP processes advertise the same native runtime through clipboard support.
    const nativeReveal = value.capabilities?.reveal ?? value.capabilities?.clipboard
    if (nativeReveal === true) {
      const session = await $.session.id()
      const result = await $.process.run([
        `${$.plugin.root}/runtime/node`,
        `${$.plugin.root}/dist/reveal.js`,
        session,
        value.url,
      ])
      if (result.exitCode !== 0) {
        throw new Error(result.stderr.trim() || text.revealError)
      }
    } else {
      $.ui.toast(text.revealHint)
    }
  }
  browser = value
}

async function openViewer($, location, isUserClick = false) {
  try {
    await enqueue($, async () => {
      const value = await viewerLocation($, location)
      await presentViewer($, value, isUserClick)
    })
  } catch (error) {
    $.ui.toast(`Code Viewer: ${error instanceof Error ? error.message : String(error)}`)
  }
}

async function approveOpen(_engine, event, next) {
  const decision = await next(event)

  return canApproveOpen({check: event, decision, origin: next.origin, phase})
    ? {
        ...decision,
        decision: 'allow',
        reason:
          phase.kind === 'attachments'
            ? 'Read user-selected Code Viewer snapshots for this composer message.'
            : 'Requested Code Viewer opening and in-place following.',
      }
    : decision
}

async function readAttachments($) {
  const connection = await $.mcp.connect('viewer')
  if (!connection.isConnected) {
    throw new Error(connection.message)
  }
  phase = {kind: 'attachments'}
  try {
    const result = await $.mcp.call(connection.server, 'code.attachments', {})
    if (result.isError) {
      throw new Error(text.attachmentError)
    }
    return result.content.flatMap((entry) => (entry.type === 'text' ? [entry.text] : []))
  } finally {
    phase = {kind: 'idle'}
  }
}

/** Registers on-demand Browser opening, location following and retained chat snapshots. */
export function register(on) {
  on('prompt.submit', async ($, event, next) => {
    if (!desktop || event.origin.kind !== 'composer' || browser === undefined) {
      return next(event)
    }
    let attachments
    try {
      attachments = await enqueue($, () => readAttachments($))
    } catch (error) {
      $.ui.log(`Code Viewer attachments: ${String(error)}`, {to: 'debug'})
      $.ui.toast(`Code Viewer: ${error instanceof Error ? error.message : String(error)}`)
      return {drop: text.sendError}
    }
    return next({...event, context: [...(event.context ?? []), ...attachments]})
  })
  on('session.start', async ($, event, next) => {
    const result = await next(event)
    desktop = event.surface === 'desktop' || (await $.session.surfaces()).includes('desktop')
    if (desktop) {
      await refreshMessages($)
    }
    workspace = result.cwd ?? (await $.session.cwd())
    if ((await $.ui.panes()).some((pane) => pane.id === 'code-viewer-pane')) {
      await $.ui.close({id: 'code-viewer-pane'})
    }
    return result
  })
  on('session.attach', async ($, event, next) => {
    const result = await next(event)
    if (event.surface === 'desktop') {
      desktop = true
      await refreshMessages($)
    }
    return result
  })
  on('command.run', {command: 'code-viewer:open'}, async ($) => {
    await openViewer($)
    return {}
  })
  on(
    'ui.press',
    {element: ['code-viewer:open', 'code-viewer:links'], plugin: 'code-viewer'},
    async ($, event, next) => {
      if (event.surface !== 'desktop') {
        return next(event)
      }
      const target =
        event.element === 'code-viewer:open'
          ? undefined
          : messages.get(event.requestId)?.find((link) => link.href === event.link?.href)?.location
      if (event.element === 'code-viewer:links' && target === undefined) {
        return next(event)
      }
      await openViewer($, target, true)
      return {element: event.element}
    },
  )
  on('ui.render', {component: 'SessionMode'}, async ($, event, next) => {
    const original = await next(event)
    if (event.surface !== 'desktop') {
      return original
    }
    const {Box, Button} = $.ui.resolve(event)
    await refreshMessages($)
    return Box({
      children: [
        original,
        Button({key: 'code-viewer:open', label: text.openViewer, onPress: () => undefined}),
      ],
      flexDirection: 'row',
    })
  })
  on('ui.render', {component: 'AssistantMessage'}, async ($, event, next) => {
    if (event.surface !== 'desktop') {
      return next(event)
    }
    const {Markdown} = $.ui.resolve(event)
    workspace = await $.session.cwd()
    const message =
      event.props.text.length <= MAX_MARKDOWN_CHARS
        ? readFileLinks(event.props.text, workspace)
        : {links: [], text: event.props.text}
    messages.set(event.requestId, message.links)
    const original =
      message.links.length > 0 &&
      message.links.length <= MAX_FILE_LINKS &&
      message.text.length <= MAX_MARKDOWN_CHARS
        ? Markdown({
            key: 'code-viewer:links',
            onLinkPress: () => undefined,
            pressableLinks: message.links.map((link) => link.href),
            text: message.text,
          })
        : await next(event)
    return original
  })
  on('tool.call', {tool: ['Read', 'Edit', 'Write']}, async ($, event, next) => {
    const result = await next(event)
    const location =
      desktop && next.origin.plugin === 'engine' ? readToolLocation(event, result) : undefined
    if (location !== undefined && isProjectFile(location.path, await $.session.cwd())) {
      if (browser !== undefined) {
        await enqueue($, () => viewerLocation($, location)).catch(() => undefined)
      }
    }
    return result
  })
  on(
    'tool.call',
    {tool: 'mcp__plugin_code-viewer_viewer__code_browser'},
    async (_engine, event, next) => {
      const result = await next(event)
      if (
        desktop &&
        next.origin.plugin === 'engine' &&
        !result.isError &&
        result.deny === undefined
      ) {
        const value = typeof result.result === 'string' ? JSON.parse(result.result) : result.result
        if (typeof value?.url === 'string') {
          browser = value
        }
      }
      return result
    },
  )
  on('prompt.context', async (_engine, event, next) => {
    const result = await next(event)
    return desktop
      ? {...result, blocks: [...result.blocks, {name: 'codeViewer', text: guidance}]}
      : result
  })
  on('tool.check', {tool: 'mcp__plugin_code-viewer_viewer__code_browser'}, approveOpen).catch(
    approveOpen,
  )
  on('tool.check', {tool: 'mcp__Claude_Browser__navigate'}, approveOpen).catch(approveOpen)
  on('tool.check', {tool: 'mcp__Claude_Browser__preview_start'}, approveOpen).catch(approveOpen)
  on('tool.check', {tool: 'mcp__plugin_code-viewer_viewer__code_attachments'}, approveOpen).catch(
    approveOpen,
  )
}
