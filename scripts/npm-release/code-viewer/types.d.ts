export interface CompareFilesOptions {
  readonly packed: string
  readonly installed: string
}

export interface RegistryRequest {
  readonly method: string | undefined
  readonly path: string
}

export interface RegistryOptions {
  readonly root: string
  readonly manifest: {readonly name: string; readonly version: string}
  readonly bytes: Buffer
}

export interface RuntimeOptions extends CompareFilesOptions {
  readonly packageRoot: string
  readonly root: string
  readonly home: string
}

export interface NavigationLocation {
  readonly path: string
  readonly line: number
  readonly column: number
  readonly preview: string
}

export interface RuntimeResult {
  readonly tools: readonly string[]
  readonly resources: readonly string[]
  readonly navigation: readonly NavigationLocation[]
  readonly serverStderr: string
}

export interface VerificationReceipt extends Partial<RuntimeResult> {
  readonly archive: string
  readonly bytes: number
  readonly sha256: string
  readonly node: string
  readonly checks: string[]
  codex?: string
  version?: string
  filesCompared?: number
  installed?: string
  passed?: boolean
  error?: string
  requests?: readonly RegistryRequest[]
}
