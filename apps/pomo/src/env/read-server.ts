import {z} from 'zod'

export interface ServerRuntimeEnv {
  readonly [name: string]: string | boolean | number | undefined
}

interface EnvIssue {
  readonly message?: string
}

/** Throws the first environment validation issue as a TypeError. */
export const throwEnvError = (issues: readonly EnvIssue[]): never => {
  const [issue] = issues

  throw new TypeError(issue?.message ?? 'Invalid environment', {cause: issues})
}

/** Parses the supplied runtime environment against a server-only schema. */
export const readServerEnv = <TServer extends z.ZodRawShape>(
  server: TServer,
  runtimeEnv: ServerRuntimeEnv = process.env,
): z.output<z.ZodObject<TServer>> => {
  const parsed = z.object(server).safeParse({...runtimeEnv})

  if (parsed.success) {
    return parsed.data
  }

  return throwEnvError(parsed.error.issues)
}
