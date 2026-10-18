const PATHS: ReadonlyMap<string, readonly string[]> = new Map([
  ['Cargo.toml', ['target']],
  ['go.mod', ['vendor']],
  ['composer.json', ['vendor']],
  ['Gemfile', ['vendor/bundle']],
  ['pom.xml', ['target']],
  ['build.gradle', ['build']],
  ['build.gradle.kts', ['build']],
  ['mix.exs', ['deps', '_build']],
])

/** Identifies default dependency and output paths from project manifest filenames. */
export const getDependencyPaths = (names: readonly string[]): readonly string[] =>
  names.flatMap((name) =>
    /\.(?:csproj|fsproj|vbproj)$/u.test(name) ? ['bin', 'obj'] : (PATHS.get(name) ?? []),
  )
