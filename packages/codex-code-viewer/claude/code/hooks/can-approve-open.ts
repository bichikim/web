export type OpenPhase =
  | {readonly kind: 'idle'}
  | {readonly kind: 'attachments'}
  | {readonly kind: 'viewer'; readonly workspace?: string}
  | {readonly kind: 'browser'; readonly url: string}
  | {readonly kind: 'reopen'; readonly url: string}
  | {
      readonly kind: 'follow'
      readonly location: {
        readonly path: string
        readonly line: number
        readonly column: number
        readonly workspace?: string
      }
    }

interface OpenPermission {
  readonly phase: OpenPhase
  readonly origin: {readonly plugin: string}
  readonly check: {
    readonly tool: string
    readonly input: unknown
    readonly agentId?: string
    readonly ceiling?: string
  }
  readonly decision: {
    readonly decision: string
    readonly rule?: string
    readonly hook?: string
    readonly ceiling?: string
  }
}

const matchesLocation = (input: object, location: object): boolean => {
  const fields = Object.entries(location)
  return (
    Object.keys(input).length === fields.length &&
    fields.every(([key, value]) => Object.hasOwn(input, key) && Reflect.get(input, key) === value)
  )
}

const viewerInput = (workspace?: string): object => (workspace === undefined ? {} : {workspace})
const browserTools = {
  browser: 'mcp__Claude_Browser__navigate',
  reopen: 'mcp__Claude_Browser__preview_start',
} as const

const hasPermissionRestriction = ({origin, check, decision}: OpenPermission): boolean =>
  origin.plugin !== 'code-viewer' ||
  check.agentId !== undefined ||
  check.ceiling !== undefined ||
  decision.ceiling !== undefined ||
  decision.decision !== 'ask' ||
  decision.rule !== undefined ||
  decision.hook !== undefined

/** Matches only this Mod's pending viewer call without an explicit permission restriction. */
export const canApproveOpen = (permission: OpenPermission): boolean => {
  const {phase, check} = permission
  if (
    hasPermissionRestriction(permission) ||
    typeof check.input !== 'object' ||
    check.input === null ||
    Array.isArray(check.input)
  ) {
    return false
  }
  switch (phase.kind) {
    case 'idle':
      return false
    case 'attachments':
      return (
        check.tool === 'mcp__plugin_code-viewer_viewer__code_attachments' &&
        matchesLocation(check.input, {})
      )
    case 'viewer':
      return (
        check.tool === 'mcp__plugin_code-viewer_viewer__code_browser' &&
        matchesLocation(check.input, viewerInput(phase.workspace))
      )
    case 'follow':
      return (
        check.tool === 'mcp__plugin_code-viewer_viewer__code_browser' &&
        matchesLocation(check.input, phase.location)
      )
    case 'browser':
    case 'reopen':
      return (
        check.tool === browserTools[phase.kind] && matchesLocation(check.input, {url: phase.url})
      )
  }
}
