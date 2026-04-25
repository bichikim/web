export const DEFAULT_WORKING_DIRECTORY = '/'

export const DEFAULT_AGENT_POST_URL = 'http://localhost:3040/agent'

export const readConfiguredAgentPostUrl = (): string =>
  import.meta.env.VITE_AGENT_POST_URL ?? DEFAULT_AGENT_POST_URL
