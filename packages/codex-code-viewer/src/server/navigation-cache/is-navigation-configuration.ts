/** Identifies files whose changes can alter project-wide module or analyzer resolution. */
export const isNavigationConfiguration = (path: string): boolean =>
  /\.(?:jsonc?|json5|toml|ya?ml|cfg|ini)$/u.test(path) ||
  /(?:^|\/)(?:Gemfile|gems\.rb)$/u.test(path)
