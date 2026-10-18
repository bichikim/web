import {describe, expect, it, vi} from 'vitest'
import {type CodeDocument, success} from '../../shared/contracts'
import {resolveNavigation} from '../resolve-navigation'

const source = 'export const greet = () => 1'
const document = (text = source): CodeDocument => ({
  lines: [],
  location: {column: 1, line: 1, path: 'core.ts'},
  revision: 'saved',
  source: text,
})
const setup = (text = source) => {
  const location = {column: 9, line: 1, path: 'consumer.ts'}
  const workspace = {
    definitions: vi.fn(async () => success([{column: 17, line: 1, path: 'other.ts'}])),
    directFunctionReferences: true,
    followPath: vi.fn(),
    references: vi.fn(async () => success([location])),
    root: '/workspace',
  }
  const input = {
    document: document(text),
    navigation: 'definition',
    offset: text.indexOf('greet'),
    path: 'core.ts',
    previews: false,
    workspace,
  } as const
  return {input, location, workspace}
}

describe('resolveNavigation', () => {
  it('should query references directly for a selected exported arrow declaration', async () => {
    const {workspace, input, location} = setup()
    expect(await resolveNavigation(input)).toEqual(
      success({kind: 'references', locations: [location]}),
    )
    expect(workspace.definitions).not.toHaveBeenCalled()
    expect(workspace.references).toHaveBeenCalledOnce()
  })
  it('should retain definition routing for providers without direct declaration support', async () => {
    const {workspace, input} = setup()
    const result = await resolveNavigation({
      ...input,
      workspace: {...workspace, directFunctionReferences: false},
    })
    expect(result).toEqual(
      success({kind: 'definition', locations: [{column: 17, line: 1, path: 'other.ts'}]}),
    )
    expect(workspace.definitions).toHaveBeenCalledOnce()
    expect(workspace.references).not.toHaveBeenCalled()
  })
  it.each([
    "export const greet = require('./other')",
    'export const greet = () => 1; const greet = () => 2',
    'export const greet = function inner() {}',
  ])('should retain semantic origin verification for %s', async (text) => {
    const {workspace, input} = setup(text)
    expect((await resolveNavigation(input)).ok).toBe(true)
    expect(workspace.definitions).toHaveBeenCalledOnce()
    expect(workspace.references).not.toHaveBeenCalled()
  })
  it('should retain definition lookup at a call site', async () => {
    const {workspace, input} = setup(`${source}\ngreet()`)
    await resolveNavigation({...input, offset: input.document.source.lastIndexOf('greet')})
    expect(workspace.definitions).toHaveBeenCalledOnce()
    expect(workspace.references).not.toHaveBeenCalled()
  })
  it('should retain the native cancellation and streaming callbacks for direct references', async () => {
    const {workspace, input} = setup()
    const receive = vi.fn()
    const signal = new AbortController().signal
    await resolveNavigation({...input, receive, signal})
    expect(workspace.references).toHaveBeenCalledWith('core.ts', 13, undefined, {receive, signal})
    expect(workspace.definitions).not.toHaveBeenCalled()
  })
  it('should forward cancellation when no streaming callback was provided', async () => {
    const {workspace, input} = setup()
    const signal = new AbortController().signal
    await resolveNavigation({...input, signal})
    expect(workspace.references).toHaveBeenCalledWith('core.ts', 13, undefined, {
      receive: undefined,
      signal,
    })
  })
  it('should use a changed draft when deciding whether a declaration owns the selected token', async () => {
    const {workspace, input} = setup()
    const draft = "export const greet = require('./other')"
    await resolveNavigation({...input, sources: [{path: 'core.ts', source: draft}]})
    expect(workspace.definitions).toHaveBeenCalledOnce()
    expect(workspace.references).not.toHaveBeenCalled()
  })
})
