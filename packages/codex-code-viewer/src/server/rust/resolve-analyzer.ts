import {existsSync} from 'node:fs'
import {fileURLToPath} from 'node:url'

/** Resolves the bundled analyzer for the current host, or an explicitly configured executable. */
export const resolveAnalyzer = (): string => {
  const configured = process.env.RUST_ANALYZER_BINARY
  if (configured !== undefined && configured !== '') {
    return configured
  }
  const host = `${process.platform}-${process.arch}`
  const binary = process.platform === 'win32' ? 'rust-analyzer.exe' : 'rust-analyzer'
  const bundled = new URL(`./rust/${host}/${binary}`, import.meta.url)
  const development = new URL(`../../../dist/rust/${host}/${binary}`, import.meta.url)
  return fileURLToPath(existsSync(bundled) ? bundled : development)
}
