import {existsSync} from 'node:fs'
import {homedir} from 'node:os'
import {join, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import analyzers from '../../../rust-analyzers.json' with {type: 'json'}
import {ensureAnalyzer} from './ensure-analyzer'

/** Resolves a configured, bundled or downloaded analyzer for the current host. */
export const resolveAnalyzer = async (): Promise<string> => {
  const configured = process.env.RUST_ANALYZER_BINARY
  if (configured !== undefined && configured !== '') {
    return configured
  }
  const host = `${process.platform}-${process.arch}`
  const binary = process.platform === 'win32' ? 'rust-analyzer.exe' : 'rust-analyzer'
  const bundled = new URL(`./rust/${host}/${binary}`, import.meta.url)
  const development = new URL(`../../../dist/rust/${host}/${binary}`, import.meta.url)
  const available = [bundled, development].find((path) => existsSync(path))
  if (available !== undefined) {
    return fileURLToPath(available)
  }
  const asset = analyzers.assets.find((candidate) => candidate.host === host)
  if (asset === undefined) {
    throw new Error(`Unsupported Rust analyzer host: ${host}`)
  }
  const home = resolve(process.env.CODEX_HOME || join(homedir(), '.codex'))
  return ensureAnalyzer({
    asset,
    cacheRoot: join(home, 'cache', 'codex-code-viewer', 'rust'),
    version: analyzers.version,
  })
}
