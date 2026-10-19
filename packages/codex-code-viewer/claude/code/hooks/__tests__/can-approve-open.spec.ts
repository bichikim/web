import {expect, it} from 'vitest'
import {canApproveOpen} from '../can-approve-open'

const viewer = {
  check: {input: {}, tool: 'mcp__plugin_code-viewer_viewer__code_browser'},
  decision: {decision: 'ask'},
  origin: {plugin: 'code-viewer'},
  phase: {kind: 'viewer'},
} as const

it('should approve only the Mod-owned viewer call during automatic opening', () => {
  expect(canApproveOpen(viewer)).toBe(true)
  expect(canApproveOpen({...viewer, origin: {plugin: 'engine'}})).toBe(false)
  expect(canApproveOpen({...viewer, origin: {plugin: 'another-plugin'}})).toBe(false)
  expect(canApproveOpen({...viewer, phase: {kind: 'idle'}})).toBe(false)
  expect(canApproveOpen({...viewer, check: {...viewer.check, input: {path: '/other'}}})).toBe(false)
  expect(
    canApproveOpen({
      ...viewer,
      check: {...viewer.check, tool: 'mcp__plugin_code-viewer_viewer__code_attachments'},
    }),
  ).toBe(false)
})

it('should approve only retained snapshots during the Mod-owned composer read', () => {
  const pending = {
    ...viewer,
    check: {input: {}, tool: 'mcp__plugin_code-viewer_viewer__code_attachments'},
    phase: {kind: 'attachments'},
  } as const
  expect(canApproveOpen(pending)).toBe(true)
  expect(canApproveOpen({...pending, phase: {kind: 'idle'}})).toBe(false)
  expect(canApproveOpen({...pending, origin: {plugin: 'engine'}})).toBe(false)
  expect(canApproveOpen({...pending, origin: {plugin: 'other'}})).toBe(false)
  expect(canApproveOpen({...pending, check: {...pending.check, input: {session: 'other'}}})).toBe(
    false,
  )
  expect(canApproveOpen({...pending, check: {...pending.check, agentId: 'worker'}})).toBe(false)
  expect(canApproveOpen({...pending, check: {...pending.check, tool: viewer.check.tool}})).toBe(
    false,
  )
})

it('should preserve restrictions when reading retained snapshots', () => {
  const pending = {
    ...viewer,
    check: {input: {}, tool: 'mcp__plugin_code-viewer_viewer__code_attachments'},
    phase: {kind: 'attachments'},
  } as const
  expect(canApproveOpen({...pending, decision: {decision: 'deny'}})).toBe(false)
  expect(canApproveOpen({...pending, decision: {decision: 'ask', rule: 'explicit ask'}})).toBe(
    false,
  )
  expect(canApproveOpen({...pending, decision: {decision: 'ask', hook: 'PreToolUse'}})).toBe(false)
  expect(canApproveOpen({...pending, decision: {ceiling: 'ask', decision: 'ask'}})).toBe(false)
  expect(canApproveOpen({...pending, check: {...pending.check, ceiling: 'ask'}})).toBe(false)
})

it('should approve only the exact viewer URL for the pending Browser navigation', () => {
  const url = 'http://127.0.0.1:54321/#token=viewer'
  const browser = {
    ...viewer,
    check: {input: {url}, tool: 'mcp__Claude_Browser__navigate'},
    phase: {kind: 'browser', url},
  } as const
  expect(canApproveOpen(browser)).toBe(true)
  expect(
    canApproveOpen({...browser, check: {...browser.check, input: {url: 'https://example.com/'}}}),
  ).toBe(false)
  expect(canApproveOpen({...browser, check: {...browser.check, input: {extra: true, url}}})).toBe(
    false,
  )
  expect(canApproveOpen({...browser, check: {...browser.check, agentId: 'subagent'}})).toBe(false)
})

it('should preserve explicit permission rules, denials and administrator ceilings', () => {
  expect(canApproveOpen({...viewer, decision: {decision: 'deny'}})).toBe(false)
  expect(canApproveOpen({...viewer, decision: {decision: 'ask', rule: 'explicit ask'}})).toBe(false)
  expect(canApproveOpen({...viewer, decision: {decision: 'ask', hook: 'PreToolUse'}})).toBe(false)
  expect(canApproveOpen({...viewer, decision: {ceiling: 'ask', decision: 'ask'}})).toBe(false)
  expect(canApproveOpen({...viewer, check: {...viewer.check, ceiling: 'ask'}})).toBe(false)
})

it('should approve only the pending Mod-owned file location', () => {
  const location = {column: 1, line: 12, path: '/project/example.ts'}
  const follow = {
    ...viewer,
    check: {...viewer.check, input: location},
    phase: {kind: 'follow', location},
  } as const
  expect(canApproveOpen(follow)).toBe(true)
  expect(canApproveOpen({...follow, origin: {plugin: 'engine'}})).toBe(false)
  expect(canApproveOpen({...follow, origin: {plugin: 'another-plugin'}})).toBe(false)
  expect(canApproveOpen({...follow, check: {...follow.check, agentId: 'worker'}})).toBe(false)
  expect(
    canApproveOpen({...follow, check: {...follow.check, input: {...location, path: '/other.ts'}}}),
  ).toBe(false)
  expect(
    canApproveOpen({...follow, check: {...follow.check, input: {...location, line: 13}}}),
  ).toBe(false)
  expect(
    canApproveOpen({...follow, check: {...follow.check, input: {...location, column: 2}}}),
  ).toBe(false)
  expect(
    canApproveOpen({...follow, check: {...follow.check, input: {...location, extra: true}}}),
  ).toBe(false)
  expect(canApproveOpen({...follow, check: {...follow.check, input: {path: location.path}}})).toBe(
    false,
  )
  expect(
    canApproveOpen({...follow, check: {...follow.check, tool: 'mcp__Claude_Browser__navigate'}}),
  ).toBe(false)
})

it('should preserve permission restrictions during automatic following', () => {
  const location = {column: 1, line: 12, path: '/project/example.ts'}
  const follow = {
    ...viewer,
    check: {...viewer.check, input: location},
    phase: {kind: 'follow', location},
  } as const
  expect(canApproveOpen({...follow, decision: {decision: 'deny'}})).toBe(false)
  expect(canApproveOpen({...follow, decision: {decision: 'ask', rule: 'explicit ask'}})).toBe(false)
  expect(canApproveOpen({...follow, decision: {decision: 'ask', hook: 'PreToolUse'}})).toBe(false)
  expect(canApproveOpen({...follow, decision: {ceiling: 'ask', decision: 'ask'}})).toBe(false)
  expect(canApproveOpen({...follow, check: {...follow.check, ceiling: 'ask'}})).toBe(false)
})

it('should approve only the exact current workspace on launcher and file-link calls', () => {
  const workspace = '/project-worktree'
  const opening = {
    ...viewer,
    check: {...viewer.check, input: {workspace}},
    phase: {kind: 'viewer', workspace},
  } as const
  expect(canApproveOpen(opening)).toBe(true)
  expect(
    canApproveOpen({...opening, check: {...opening.check, input: {workspace: '/other'}}}),
  ).toBe(false)
  expect(canApproveOpen({...opening, check: {...opening.check, input: {}}})).toBe(false)
  expect(canApproveOpen({...opening, decision: {decision: 'deny'}})).toBe(false)
  const location = {column: 3, line: 7, path: `${workspace}/main.ts`, workspace}
  const following = {
    ...viewer,
    check: {...viewer.check, input: location},
    phase: {kind: 'follow', location},
  } as const
  expect(canApproveOpen(following)).toBe(true)
  expect(
    canApproveOpen({
      ...following,
      check: {...following.check, input: {...location, workspace: '/other'}},
    }),
  ).toBe(false)
})

it('should approve only the pending clicked viewer URL when reopening Browser', () => {
  const url = `http://127.0.0.1:54321/#token=${'a'.repeat(64)}`
  const opening = {
    ...viewer,
    check: {input: {url}, tool: 'mcp__Claude_Browser__preview_start'},
    phase: {kind: 'reopen', url},
  } as const
  expect(canApproveOpen(opening)).toBe(true)
  expect(canApproveOpen({...opening, phase: {kind: 'idle'}})).toBe(false)
  expect(canApproveOpen({...opening, origin: {plugin: 'engine'}})).toBe(false)
  expect(canApproveOpen({...opening, decision: {decision: 'deny'}})).toBe(false)
  expect(canApproveOpen({...opening, decision: {decision: 'ask', rule: 'explicit ask'}})).toBe(
    false,
  )
  expect(canApproveOpen({...opening, decision: {decision: 'ask', hook: 'PreToolUse'}})).toBe(false)
  expect(canApproveOpen({...opening, decision: {ceiling: 'ask', decision: 'ask'}})).toBe(false)
  expect(canApproveOpen({...opening, check: {...opening.check, ceiling: 'ask'}})).toBe(false)
  expect(canApproveOpen({...opening, check: {...opening.check, agentId: 'worker'}})).toBe(false)
  expect(
    canApproveOpen({...opening, check: {...opening.check, input: {url: 'https://example.com/'}}}),
  ).toBe(false)
  expect(
    canApproveOpen({...opening, check: {...opening.check, input: {command: 'server', url}}}),
  ).toBe(false)
  expect(
    canApproveOpen({...opening, check: {...opening.check, tool: 'mcp__Claude_Browser__navigate'}}),
  ).toBe(false)
})
