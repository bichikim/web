import {readRecord} from './read-record'
import {readField} from './read-field'
import {readArray} from './read-array'
import {readText} from './read-text'
import type {CodeDocument} from '../../../../src/shared/contracts'
import type {On} from 'claude-code'
import type {Mounted} from 'claude-code/testing'
/* eslint-disable eslint-js/camelcase -- Claude tool arguments use snake case. */
const TOKEN_LENGTH = 64
export const url = `http://127.0.0.1:54321/#token=${'a'.repeat(TOKEN_LENGTH)}`
export const paneTarget = {
  component: 'Pane' as const,
  plugin: 'code-viewer',
  props: {
    bodyColumns: 60,
    isFocused: true,
    placement: 'dock' as const,
    scroll: {bodyRows: 40, offset: 0},
    title: 'Code Viewer Pane',
    view: {},
  },
  requestId: 'code-viewer-pane',
  surface: 'desktop' as const,
}

export function projectFixture(on: On, clipboardEnabled = false) {
  const highlights = new Map<string, unknown>()
  const previews = new Map<string, Record<string, unknown>>()
  const destinations = new Map<string, unknown>()
  const clipboard = {text: ''}
  const stored = new Map<string, unknown>()
  const requests: ViewerRequest[] = []
  const calls: string[] = []
  const notices: string[] = []
  const files = new Map<string, Pick<CodeDocument, 'revision' | 'source' | 'media'>>([
    ['a.ts', {revision: 'a1', source: "export const value = 'disk'\n"}],
    ['b.ts', {revision: 'b1', source: 'export const other = 2\n'}],
  ])
  on('clock.now', () => ({value: 1000}))
  on('session.start', () => ({cwd: '/project'}))
  on('session.id', () => ({value: 'session-one'}))
  on('store.get', (_, input) => ({value: stored.get(input.key)}))
  on('store.set', (_, input) => {
    stored.set(input.key, JSON.parse(JSON.stringify(input.value)))
    return {value: undefined}
  })
  on('mcp.call', () => ({value: {content: [], isError: false}}))
  on('mcp.connect', () => ({value: {isConnected: true, server: 'plugin:code-viewer:viewer'}}))
  on('tool.call', (_, input) => {
    calls.push(input.tool)
    return input.tool === 'Read'
      ? {result: {file: {filePath: input.file_path, startLine: input.offset ?? 1}, type: 'text'}}
      : {
          result: JSON.stringify({
            capabilities: {clipboard: clipboardEnabled},
            session: 'viewer-session',
            url,
            workspace: '/project',
          }),
        }
  })
  on('ui.open', () => ({value: {isPlaced: true}}))
  on('ui.toast', (_, input) => {
    notices.push(input.text)
    return {value: undefined}
  })
  on('ui.log', () => ({value: undefined}))
  on('http.fetch', (_, input) => {
    const value: unknown = JSON.parse(String(required(input.init).body))
    const request: ViewerRequest = {
      arguments: readRecord(readField(value, 'arguments')),
      name: readText(readField(value, 'name')),
    }
    requests.push(request)
    const args = request.arguments
    const path =
      typeof args.path === 'string'
        ? args.path.replace(/^\/project\//u, '').replace(/^\.\//u, '')
        : ''
    let result: unknown
    const clipboardResult = boundaryResponse(request.name, args, clipboard, previews)
    if (clipboardResult !== undefined) {
      result = clipboardResult
    } else if (request.name === 'code.create') {
      const created = [args.parent, args.name].filter(Boolean).join('/')
      files.set(created, {revision: 'created', source: ''})
      result = {structuredContent: {kind: args.kind, path: created}}
    } else if (request.name === 'code.entry') {
      result = {structuredContent: {kind: 'file', path, revision: files.get(path)?.revision}}
    } else if (request.name === 'code.rename') {
      const renamed = [...path.split('/').slice(0, -1), args.name].join('/')
      files.set(renamed, required(files.get(path)))
      files.delete(path)
      result = {structuredContent: {kind: 'file', path: renamed}}
    } else if (request.name === 'code.tree') {
      result = {
        structuredContent: {
          directories: ['empty'],
          files: [...files.keys()].map((path) => ({openable: true, path})),
          truncated: false,
        },
      }
    } else if (request.name === 'code.navigate') {
      result = {structuredContent: navigationResult(destinations, args)}
    } else if (request.name === 'code.highlight') {
      result = {structuredContent: {lines: highlightLines(highlights, args)}}
    } else if (request.name === 'code.preview') {
      result = {
        structuredContent: {
          columns: 2,
          ok: true,
          rows:
            args.source === ''
              ? []
              : [
                  ['name', 'count'],
                  ['quoted, name', '2'],
                  ['alpha', '10'],
                  ['Beta', '1'],
                ],
          truncated: false,
        },
      }
    } else if (request.name === 'code.list') {
      result = {
        structuredContent: {
          paths: [...files.keys()].filter((entry) => entry.includes(readText(args.query))),
        },
      }
    } else if (path.startsWith('../')) {
      result = {isError: true, structuredContent: {code: 'outside-workspace'}}
    } else if (!files.has(path)) {
      result = {isError: true, structuredContent: {code: 'not-found'}}
    } else if (
      request.name === 'code.write' &&
      args.revision !== required(files.get(path)).revision
    ) {
      result = {isError: true, structuredContent: {code: 'write-conflict'}}
    } else {
      if (request.name === 'code.write') {
        files.set(path, {
          revision: `${required(files.get(path)).revision}-saved`,
          source: readText(args.source),
        })
      }
      result = {
        structuredContent: {
          document: {
            ...files.get(path),
            location: {column: args.column ?? 1, line: args.line ?? 1, path},
          },
        },
      }
    }
    return {value: {headers: {}, ok: true, status: 200, text: JSON.stringify(result)}}
  })
  return {calls, clipboard, destinations, files, highlights, notices, previews, requests, stored}
}

export async function activateTree(
  pane: Mounted<'desktop', 'Pane'>,
  path: string,
  kind = 'activate',
) {
  const [tree] = await treeInputs(pane)
  const index = (await treeRows(pane)).findIndex((row) => row.path === path)
  if (index < 0) {
    throw new Error(`Tree row missing: ${path}`)
  }
  await pane.post({index, kind, path}, {in: readText(tree?.props.key)})
}

export const treeInputs = async (pane: Mounted<'desktop', 'Pane'>) =>
  (await pane.findAll({type: 'Client'})).filter((entry) => entry.props.key === 'file-tree:viewport')
export const treeRows = async (
  pane: Mounted<'desktop', 'Pane'>,
): Promise<readonly {path: string}[]> =>
  readArray(readField((await treeInputs(pane))[0], 'props', 'props', 'rows') ?? []).map((row) => ({
    path: readText(readField(row, 'path')),
  }))

export async function editLine(pane: Mounted<'desktop', 'Pane'>, line: number, text: string) {
  let client = await pane.find({key: 'code-editor', type: 'Client'})
  if (!readField(client, 'props', 'props', 'editable')) {
    await pane.press({key: 'edit'})
    client = await pane.find({key: 'code-editor', type: 'Client'})
  }
  const source = readText(readField(client, 'props', 'props', 'source'))
  const lines = source.split('\n')
  lines[line - 1] = text + (lines[line - 1].endsWith('\r') ? '\r' : '')
  await pane.key({ctrl: true, in: 'code-editor', key: 'a'})
  await pane.key({in: 'code-editor', key: lines.join('\n')})
  await pane.key({ctrl: true, in: 'code-editor', key: 'home'})
}

function boundaryResponse(
  name: string,
  args: Readonly<Record<string, unknown>>,
  clipboard: {text: string},
  previews: Map<string, Record<string, unknown>>,
) {
  if (name === 'code.documentPreview') {
    return {structuredContent: previews.get(readText(args.path))}
  }
  if (name === 'code.media') {
    return {structuredContent: previews.get(readText(args.path)) ?? {data: 'AAE=', next: 2}}
  }
  if (name === 'code.pdfPreview') {
    return {structuredContent: {...previews.get(readText(args.path)), page: args.page}}
  }
  if (name === 'code.copy') {
    clipboard.text = readText(args.text)
    return {structuredContent: {copied: true}}
  }
  if (name === 'code.paste') {
    return {structuredContent: {text: clipboard.text}}
  }
  return undefined
}

function navigationResult(
  destinations: Map<string, unknown>,
  args: Readonly<Record<string, unknown>>,
) {
  return (
    destinations.get(`${args.path}:${args.offset}`) ?? {
      kind: 'definition',
      locations: [{column: 1, line: 1, path: 'b.ts'}],
    }
  )
}
function highlightLines(highlights: Map<string, unknown>, args: Readonly<Record<string, unknown>>) {
  let offset = 0
  return (
    highlights.get(readText(args.path)) ??
    readText(args.source)
      .split('\n')
      .map((text) => {
        const token = {kind: 'plain', navigation: null, offset, text}
        offset += text.length + 1
        return [token]
      })
  )
}

export interface ViewerRequest {
  readonly name: string
  readonly arguments: Readonly<Record<string, unknown>>
}
export const required = <Value>(value: Value | undefined): Value => {
  if (value === undefined) {
    throw new Error('Missing fixture value')
  }
  return value
}
