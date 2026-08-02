import {createEnv, type StandardSchemaV1} from '@t3-oss/env-core'
import {z} from 'zod'

const DEFAULT_PORT = 3000
const MAX_PORT = 65_535

const serverEnvironmentSchema = {
  HOST: z.string().trim().min(1).default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(MAX_PORT).default(DEFAULT_PORT),
}

export interface ServerConfig {
  readonly host: string
  readonly nodeEnvironment: 'development' | 'production' | 'test'
  readonly port: number
}

const throwServerConfigError = (issues: readonly StandardSchemaV1.Issue[]): never => {
  throw new Error('Invalid server configuration', {cause: issues})
}

export const readServerConfig = (environment: NodeJS.ProcessEnv = process.env): ServerConfig => {
  const parsedEnvironment = createEnv({
    emptyStringAsUndefined: true,
    isServer: true,
    onValidationError: throwServerConfigError,
    // AI_NOTE - T3 Env removes empty-string entries, so never pass process.env by reference.
    runtimeEnv: {...environment},
    server: serverEnvironmentSchema,
  })

  return {
    host: parsedEnvironment.HOST,
    nodeEnvironment: parsedEnvironment.NODE_ENV,
    port: parsedEnvironment.PORT,
  }
}
