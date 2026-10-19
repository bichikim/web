import {focusControl} from './control-state.js'
import {handlePopoverFocus} from './pane-popover.js'
/* eslint-disable id-length -- Claude Mods validates the literal $ API parameter. */
import {canApproveOpen} from './can-approve-open.ts'
import {readToolLocation} from './read-tool-location.ts'
import {
  connectPane,
  followPane,
  handlePaneMessage,
  paneAttachments,
  renderPane,
  scrollPane,
} from './pane.js'
const PANE = 'code-viewer-pane'

/** @type {import('./can-approve-open.ts').OpenPhase} */
let phase = {kind: 'idle'}
/** @type {Promise<void> | undefined} */
let opening
let desktop = false
let following = Promise.resolve()

/** Opens the dedicated Pane without blocking the existing Browser adapter on failure. */
async function openPane($) {
  try {
    await $.ui.open({columns: 100, id: PANE, title: 'Code Viewer Pane'})
  } catch (error) {
    $.ui.log(`Code Viewer Pane: ${error instanceof Error ? error.message : String(error)}`, {
      to: 'debug',
    })
  }
}

const guidance = [
  'When explaining or modifying project code, proactively call this plugin’s code.browser',
  'with the relevant path and 1-based line and column so the user can follow along.',
  'Follow the user’s requested viewing target when specified.',
  'An open viewer updates in place. Do not navigate or reload the Browser again.',
  'Keep unsaved drafts and attachments; do not save, discard, or clear them to change location.',
  'When referring to viewer attachments or selected/unsaved code, call code.attachments first.',
  'Pane snapshots arrive alongside the user message; retain them even when Browser attachments are empty.',
  'Disk content is not a substitute for an attached snapshot.',
].join(' ')

/** @param {import('claude-code').EngineInterface} $ */
async function navigate($) {
  const connection = await $.mcp.connect('viewer')
  if (!connection.isConnected) {
    throw new Error(connection.message)
  }
  try {
    phase = {kind: 'viewer'}
    const result = await $.tool.call({tool: 'mcp__plugin_code-viewer_viewer__code_browser'})
    if (result.deny !== undefined || result.isError) {
      throw new Error(result.deny ?? result.text ?? 'Code Viewer open was rejected.')
    }
    const location = typeof result.result === 'string' ? JSON.parse(result.result) : result.result
    if (typeof location?.url !== 'string') {
      throw new Error('Code Viewer returned no URL.')
    }
    const address = new URL(location.url)
    const token = new URLSearchParams(address.hash.slice(1)).get('token')
    if (
      address.protocol !== 'http:' ||
      address.hostname !== '127.0.0.1' ||
      !/^[a-f0-9]{64}$/u.test(token ?? '')
    ) {
      throw new Error('Code Viewer did not return an authenticated loopback URL.')
    }
    if (typeof location.session === 'string' && typeof location.workspace === 'string') {
      try {
        await connectPane($, location)
      } catch (error) {
        $.ui.toast(`Code Viewer Pane: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
    phase = {kind: 'browser', url: location.url}
    const page = await $.tool.call({tool: 'mcp__Claude_Browser__navigate', url: location.url})
    if (page.isError || page.deny !== undefined) {
      throw new Error('Claude Browser could not open Code Viewer.')
    }
  } finally {
    phase = {kind: 'idle'}
  }
}

async function approveOpen(_engine, event, next) {
  const decision = await next(event)
  return canApproveOpen({check: event, decision, origin: next.origin, phase})
    ? {
        ...decision,
        decision: 'allow',
        reason: 'Automatic Code Viewer opening and following are enabled.',
      }
    : decision
}

/** @param {import('claude-code').EngineInterface} $ */
function openViewer($) {
  opening ??= navigate($)
  return opening
}

function reportFailure($, event, next) {
  const MAX_NOTICE_CHARS = 140
  opening = undefined
  $.ui.toast(
    `Code Viewer: ${(next.error.message ?? '자동 열기 시간 초과').slice(0, MAX_NOTICE_CHARS)}`,
  )
  $.ui.log(next.error.message ?? 'Code Viewer auto-open timed out.', {to: 'debug'})
  return next(event)
}

/** Registers one automatic viewer open when a Desktop client starts or joins the session. */
export function register(on) {
  on('ui.scroll', {component: 'Pane', requestId: PANE}, async ($, event, next) => {
    const offset = await scrollPane($, event)
    return next({...event, offset})
  })
  on('ui.message', {component: 'Pane'}, async ($, event, next) => {
    if (
      event.requestId !== PANE ||
      event.surface !== 'desktop' ||
      (!event.element.startsWith('control:') &&
        !event.element.startsWith('file-tree:') &&
        ![
          'file-tree',
          'code-editor',
          'panel-divider',
          'panel-divider:local-width',
          'popover-backdrop',
          'horizontal-scroll',
          'image-preview',
        ].includes(event.element))
    ) {
      return next(event)
    }
    await handlePaneMessage($, event)
    return {}
  })
  on('ui.focus', {component: 'Pane', requestId: PANE}, async ($, event, next) => {
    focusControl($, event)
    handlePopoverFocus($, event)
    return next(event)
  })
  on('ui.render', {component: 'Pane'}, async ($, event, next) => {
    if (event.surface !== 'desktop' || event.requestId !== PANE) {
      return next(event)
    }
    return renderPane($, event)
  })
  on('prompt.submit', async (_engine, event, next) =>
    next(
      desktop && event.origin.kind === 'composer'
        ? {...event, context: [...(event.context ?? []), ...paneAttachments()]}
        : event,
    ),
  )
  on(
    'tool.call',
    {tool: 'mcp__plugin_code-viewer_viewer__code_browser'},
    async ($, event, next) => {
      const result = await next(event)
      if (
        desktop &&
        next.origin.plugin === 'engine' &&
        !result.isError &&
        result.deny === undefined &&
        typeof event.path === 'string'
      ) {
        await followPane($, {column: event.column ?? 1, line: event.line ?? 1, path: event.path})
      }
      return result
    },
  )
  on('tool.check', {tool: 'mcp__plugin_code-viewer_viewer__code_browser'}, approveOpen).catch(
    approveOpen,
  )
  on('tool.check', {tool: 'mcp__Claude_Browser__navigate'}, approveOpen).catch(approveOpen)
  on('prompt.context', async (_engine, event, next) => {
    const result = await next(event)
    return desktop
      ? {...result, blocks: [...result.blocks, {name: 'codeViewer', text: guidance}]}
      : result
  })
  on('tool.call', {tool: ['Read', 'Edit', 'Write']}, async ($, event, next) => {
    const result = await next(event)
    const location =
      desktop && next.origin.plugin === 'engine' ? readToolLocation(event, result) : undefined
    if (location === undefined) {
      return result
    }
    // Serialize location calls so each permission check matches its own pending target.
    following = following.then(async () => {
      try {
        const connection = await $.mcp.connect('viewer')
        if (!connection.isConnected) {
          throw new Error(connection.message)
        }
        phase = {kind: 'follow', location}
        const response = await $.mcp.call(connection.server, 'code.browser', location)
        if (response.isError) {
          throw new Error('Code Viewer could not display the code location.')
        }
        await followPane($, location)
      } catch (error) {
        $.ui.log(`Code Viewer follow: ${error instanceof Error ? error.message : String(error)}`, {
          to: 'debug',
        })
      } finally {
        phase = {kind: 'idle'}
      }
    })
    await following
    return result
  })
  on('session.start', async ($, event, next) => {
    const result = await next(event)
    if (event.surface === 'desktop' || (await $.session.surfaces()).includes('desktop')) {
      desktop = true
      await openPane($)
      await openViewer($)
    }
    return result
  }).catch(reportFailure)
  on('session.attach', async ($, event, next) => {
    const result = await next(event)
    if (event.surface === 'desktop') {
      desktop = true
      await openPane($)
      await openViewer($)
    }
    return result
  }).catch(reportFailure)
}
