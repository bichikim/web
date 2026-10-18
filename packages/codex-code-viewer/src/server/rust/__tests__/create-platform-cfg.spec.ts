import {describe, expect, it} from 'vitest'
import {createPlatformCfg} from '../create-platform-cfg'

describe('createPlatformCfg', () => {
  it.each([
    {
      architecture: 'arm64',
      family: 'unix',
      operating: 'macos',
      platform: 'darwin',
      target: 'aarch64',
    },
    {architecture: 'x64', family: 'unix', operating: 'linux', platform: 'linux', target: 'x86_64'},
    {
      architecture: 'arm64',
      family: 'windows',
      operating: 'windows',
      platform: 'win32',
      target: 'aarch64',
    },
  ])('should derive Rust cfg from explicit $platform/$architecture inputs', (host) => {
    expect(createPlatformCfg(host)).toEqual([
      host.family,
      `target_family="${host.family}"`,
      `target_os="${host.operating}"`,
      `target_arch="${host.target}"`,
      'target_pointer_width="64"',
      'test',
      'debug_assertions',
    ])
  })
})
