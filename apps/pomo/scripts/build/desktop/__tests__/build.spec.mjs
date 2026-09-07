import {describe, expect, it} from 'vitest'

import {createDesktopBuildArguments, createDesktopBuildConfig} from '../build.mjs'

const configuration = {
  app: {
    security: {
      csp: {
        'connect-src': "'self' ipc: https://www.pomofi.io",
      },
    },
  },
}

describe('createDesktopBuildConfig', () => {
  it('should add the remote SSR origin to the Tauri connect policy', () => {
    expect(
      createDesktopBuildConfig({
        configuration,
        publicOrigin: 'https://preview.pomofi.example/path',
      }),
    ).toEqual({
      app: {
        security: {
          csp: {
            'connect-src': "'self' ipc: https://www.pomofi.io https://preview.pomofi.example",
          },
        },
      },
    })
  })

  it('should not duplicate an existing SSR origin', () => {
    const result = createDesktopBuildConfig({configuration})

    expect(result.app.security.csp['connect-src']).toBe("'self' ipc: https://www.pomofi.io")
  })

  it.each(['not-a-url', 'file:///tmp/pomo'])(
    'should reject the unsupported SSR origin %s',
    (publicOrigin) => {
      expect(() => createDesktopBuildConfig({configuration, publicOrigin})).toThrow(
        'POMO_PUBLIC_ORIGIN must be an absolute HTTP or HTTPS URL.',
      )
    },
  )
})

describe('createDesktopBuildArguments', () => {
  it('should pass the CSP merge before requested Tauri build arguments', () => {
    const result = createDesktopBuildArguments({
      buildArguments: ['--bundles', 'dmg'],
      configuration,
      publicOrigin: 'https://preview.pomofi.example',
    })

    expect(result.slice(0, 5)).toEqual(['exec', 'tauri', 'build', '--config', expect.any(String)])
    expect(JSON.parse(result[4])).toEqual(
      createDesktopBuildConfig({
        configuration,
        publicOrigin: 'https://preview.pomofi.example',
      }),
    )
    expect(result.slice(5)).toEqual(['--bundles', 'dmg'])
  })
})
