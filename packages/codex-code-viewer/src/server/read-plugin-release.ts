import {z} from 'zod'
import {versionSchema} from '../shared/plugin-updates'

const releaseSchema = z.object({
  name: z.literal('@winter-love/codex-code-viewer'),
  version: versionSchema,
})
const CHECK_TIMEOUT_MS = 15_000

/** npm의 최신 배포 버전을 조회한다. 네트워크 오류와 잘못된 응답은 예외로 전달한다. */
export const readPluginRelease = async (): Promise<string> => {
  const response = await fetch(
    'https://registry.npmjs.org/@winter-love%2Fcodex-code-viewer/latest',
    {signal: AbortSignal.timeout(CHECK_TIMEOUT_MS)},
  )
  if (!response.ok) {
    throw new Error(`npm registry: ${response.status}`)
  }
  return releaseSchema.parse(await response.json()).version
}
