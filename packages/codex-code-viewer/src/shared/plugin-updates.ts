import {z} from 'zod'

const identifier = '(?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*)'
const core = '(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)'
export const versionSchema = z
  .string()
  .regex(
    new RegExp(
      `^${core}(?:-${identifier}(?:\\.${identifier})*)?(?:\\+[0-9a-zA-Z-]+(?:\\.[0-9a-zA-Z-]+)*)?$`,
      'u',
    ),
  )
export const pluginUpdateSchema = z.object({
  current: versionSchema,
  latest: versionSchema,
  status: z.enum(['available', 'current', 'installed']),
  target: z.enum(['codex', 'claude']),
})
export type PluginUpdate = z.infer<typeof pluginUpdateSchema>
export const pluginUpdateErrorSchema = z.object({
  code: z.enum(['update-check-failed', 'update-install-failed', 'update-in-progress']),
})

/** 설치 완료를 기다리는 모든 전송 경로의 공통 제한 시간이다. */
export const UPDATE_INSTALL_TIMEOUT_MS = 1_800_000
