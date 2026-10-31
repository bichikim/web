import {z} from 'zod'
import {type AgentStateBindings, agentStateBindingsSchema} from './agent-state'
import {type PoffoLipSync, poffoLipSyncSchema} from './lipsync'
import {type SemanticAction, type SemanticBinding, semanticBindingsSchema} from './semantics'
import {
  poffoBindingsSchema,
  type PoffoTrackingBindings,
  type PoffoTrackingOptions,
  poffoTrackingOptionsSchema,
} from './tracking'

export const MAX_CONNECTION_BYTES = 262_144

export interface PoffoConnections {
  readonly trackingBindings?: PoffoTrackingBindings
  readonly trackingOptions?: PoffoTrackingOptions
  readonly lipsync?: PoffoLipSync
  readonly semanticBindings?: readonly SemanticBinding[]
  readonly agentBindings?: AgentStateBindings
}
export const poffoConnectionsSchema: z.ZodType<PoffoConnections> = z.object({
  agentBindings: agentStateBindingsSchema.optional(),
  lipsync: poffoLipSyncSchema.optional(),
  semanticBindings: semanticBindingsSchema.optional(),
  trackingBindings: poffoBindingsSchema.optional(),
  trackingOptions: poffoTrackingOptionsSchema.optional(),
})
export interface ConnectionProfile {
  readonly assetId: string
  readonly connections: PoffoConnections
  readonly format: 'poffo-connections'
  readonly version: 1
}
export const connectionProfileSchema: z.ZodType<ConnectionProfile> = z.object({
  assetId: z.string().min(1),
  connections: poffoConnectionsSchema,
  format: z.literal('poffo-connections'),
  version: z.literal(1),
})
interface ParseConnectionProfileOptions {
  readonly assetId: string
  readonly parameters: readonly {readonly id: string}[]
  /** Available character actions; omitted skips action availability checks. */
  readonly actions?: readonly SemanticAction[]
}
export type ConnectionProfileResult =
  | {readonly ok: true; readonly profile: ConnectionProfile}
  | {readonly ok: false; readonly reason: 'invalid' | 'character' | 'parameter' | 'action'}

export const parseConnectionProfile = (
  source: string,
  options: ParseConnectionProfileOptions,
): ConnectionProfileResult => {
  if (
    source.length > MAX_CONNECTION_BYTES ||
    new TextEncoder().encode(source).byteLength > MAX_CONNECTION_BYTES
  ) {
    return {ok: false, reason: 'invalid'}
  }
  let input: unknown
  try {
    input = JSON.parse(source)
  } catch {
    return {ok: false, reason: 'invalid'}
  }
  const parsed = connectionProfileSchema.safeParse(input)
  if (!parsed.success) {
    return {ok: false, reason: 'invalid'}
  }
  const profile = parsed.data
  if (profile.assetId.startsWith('builtin:') && profile.assetId !== options.assetId) {
    return {ok: false, reason: 'character'}
  }
  const {connections} = profile
  const {actions} = options
  if (
    actions !== undefined &&
    connections.semanticBindings?.some((binding) => {
      const {action} = binding
      return (
        action !== undefined &&
        !actions.some((item) => item.kind === action.kind && item.id === action.id)
      )
    })
  ) {
    return {ok: false, reason: 'action'}
  }
  const bindings = [
    ...Object.values(connections.trackingBindings ?? {}),
    connections.lipsync,
    ...Object.values(connections.lipsync?.shapes ?? {}),
    ...(connections.semanticBindings ?? []),
    ...Object.values(connections.agentBindings ?? {}),
  ]
  const missing = bindings.some((binding) => {
    const id = binding?.parameterId
    return typeof id === 'string' && !options.parameters.some((parameter) => parameter.id === id)
  })
  return missing ? {ok: false, reason: 'parameter'} : {ok: true, profile}
}
