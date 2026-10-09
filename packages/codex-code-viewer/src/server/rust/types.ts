export interface RustDependency {
  readonly crate: number
  readonly name: string
}

export interface RustCrate {
  readonly display_name: string
  readonly root_module: string
  readonly edition: '2015' | '2018' | '2021' | '2024'
  readonly deps: readonly RustDependency[]
  readonly cfg: readonly string[]
  readonly is_workspace_member: boolean
  readonly source: {
    readonly include_dirs: readonly string[]
    readonly exclude_dirs: readonly string[]
  }
}

export interface RustProject {
  readonly directory: string
  readonly crates: readonly RustCrate[]
}

export interface RustTarget {
  readonly name: string
  readonly path: string
  readonly kind: 'lib' | 'binary'
}

export interface RustPackage {
  readonly directory: string
  readonly edition: RustCrate['edition']
  readonly cfg: readonly string[]
  readonly targets: readonly RustTarget[]
  readonly dependencies: readonly {
    readonly name: string
    readonly renamed: boolean
    readonly directory: string
  }[]
}

export interface RustTargetCandidate {
  readonly name: string
  readonly kind: RustTarget['kind']
  readonly paths: readonly string[]
}

export interface RustDependencyCandidate {
  readonly manifest: string
  readonly name: string
  readonly renamed: boolean
}

export interface RustPackageDescription {
  readonly edition: RustCrate['edition']
  readonly cfg: readonly string[]
  readonly targets: readonly RustTargetCandidate[]
  readonly automatic: RustTargetCandidate | undefined
  readonly dependencies: readonly RustDependencyCandidate[]
}
