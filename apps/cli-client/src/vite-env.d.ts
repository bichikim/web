/// <reference types="vite/client" />
/// <reference types="unplugin-icons/types/solid" />

interface ImportMetaEnv {
  readonly VITE_AGENT_POST_URL: string
  readonly VITE_CLI_SERVER_PORT: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
