import {fileURLToPath} from 'node:url'
import {existsSync} from 'node:fs'
import {homedir} from 'node:os'
import {join, resolve} from 'node:path'
import analyzers from '../../../typescript-analyzers.json' with {type: 'json'}
import {ensureTypescriptAnalyzer} from './ensure-typescript-analyzer'

/** 현재 호스트의 내장 분석기를 사용하거나 고정된 버전을 검증해 내려받는다. */
export const resolveNativeBinary = async (): Promise<string> => {
  const binary = process.platform === 'win32' ? 'tsc.exe' : 'tsc'
  const directory = import.meta.url.endsWith('.ts') ? '../../../dist/' : './'
  const bundled = new URL(
    `${directory}typescript/${process.platform}-${process.arch}/${binary}`,
    import.meta.url,
  )
  if (existsSync(bundled)) {
    return fileURLToPath(bundled)
  }
  const host = `${process.platform}-${process.arch}`
  const asset = analyzers.assets.find((candidate) => candidate.host === host)
  if (asset === undefined) {
    throw new Error(`Unsupported TypeScript analyzer host: ${host}`)
  }
  return ensureTypescriptAnalyzer({
    asset,
    cacheRoot: join(
      resolve(process.env.CODEX_HOME || join(homedir(), '.codex')),
      'cache',
      'codex-code-viewer',
      'typescript',
    ),
    version: analyzers.version,
  })
}
