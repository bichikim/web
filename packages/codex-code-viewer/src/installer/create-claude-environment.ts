interface CreateClaudeEnvironmentOptions {
  readonly home: string
  readonly defaultHome: string
  readonly environment: Readonly<NodeJS.ProcessEnv>
}

/** Keeps Claude's default profile resolution unless a different config directory was requested. */
export const createClaudeEnvironment = (
  options: CreateClaudeEnvironmentOptions,
): NodeJS.ProcessEnv =>
  options.home === options.defaultHome && options.environment.CLAUDE_CONFIG_DIR === undefined
    ? {...options.environment}
    : {...options.environment, CLAUDE_CONFIG_DIR: options.home}
