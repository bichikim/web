interface CreatePlatformCfgOptions {
  readonly platform: string
  readonly architecture: string
}

/** Describes the host cfg used for local Rust analysis from an explicit platform snapshot. */
export const createPlatformCfg = (options: CreatePlatformCfgOptions): string[] => {
  const {platform, architecture} = options
  const target =
    architecture === 'arm64' ? 'aarch64' : architecture === 'x64' ? 'x86_64' : architecture
  const operating = platform === 'darwin' ? 'macos' : platform === 'win32' ? 'windows' : platform
  const family = platform === 'win32' ? 'windows' : 'unix'
  return [
    family,
    `target_family="${family}"`,
    `target_os="${operating}"`,
    `target_arch="${target}"`,
    'target_pointer_width="64"',
    'test',
    'debug_assertions',
  ]
}
