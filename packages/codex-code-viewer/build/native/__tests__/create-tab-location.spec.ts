import {describe, expect, it} from 'vitest'
import {createTabLocation} from '../create-tab-location'
import type {FileTab} from '../types'

const tab = {
  durableRoute: {
    kind: 'mcp-extension',
    params: {cwd: '/project', path: '/project/main.ts'},
    payloadVersion: 1,
  },
  instanceId: 'existing-instance',
  props: {
    content: {
      path: '/project/main.ts',
      type: 'file-viewer',
      view: {hostId: 'local', server: 'codex-code-viewer', tool: {name: 'code.file'}},
    },
  },
  state: {fileAccessApproved: true, mcpAppId: 'existing-app'},
  tabType: {kind: 'mcp-extension'},
} satisfies FileTab & {instanceId: string; state: {mcpAppId: string; fileAccessApproved: boolean}}

const input = {
  hostId: 'local',
  request: {path: 'src/next.ts', workspace: '/project'},
  server: 'codex-code-viewer',
  tab,
  workspace: '/project',
}

describe('createTabLocation', () => {
  it('should update native path, title and reopening target while retaining the initial resource', () => {
    const update = createTabLocation(input)
    expect(update).toMatchObject({
      durableRoute: {params: {cwd: '/project', path: '/project/src/next.ts'}},
      props: {
        content: {initialPath: '/project/main.ts', path: '/project/src/next.ts'},
        titleOverride: 'next.ts',
      },
      title: 'next.ts',
      tooltip: '/project/src/next.ts',
    })
    expect(update.props.content.view).toBe(tab.props.content.view)
    expect({...tab, ...update}).toMatchObject({instanceId: 'existing-instance', state: tab.state})
    expect(tab.props.content.path).toBe('/project/main.ts')
  })

  it('should retain the original resource through subsequent navigation', () => {
    const first = createTabLocation(input)
    const next = createTabLocation({
      ...input,
      request: {path: '/project/main.ts', workspace: '/project'},
      tab: {...tab, ...first},
    })
    expect(next.props.content).toMatchObject({
      initialPath: '/project/main.ts',
      path: '/project/main.ts',
    })
  })

  it.each(['../secret.ts', '/project-other/secret.ts', '/etc/passwd', 'src/../secret.ts', ''])(
    'should reject a path outside the approved workspace contract: %s',
    (path) => {
      expect(() => createTabLocation({...input, request: {path, workspace: '/project'}})).toThrow()
    },
  )

  it('should reject an attempt to widen the workspace or act on another viewer', () => {
    expect(() =>
      createTabLocation({...input, request: {path: '/etc/passwd', workspace: '/'}}),
    ).toThrow()
    expect(() => createTabLocation({...input, server: 'other-plugin'})).toThrow()
    expect(() => createTabLocation({...input, hostId: 'other-host'})).toThrow()
    expect(() =>
      createTabLocation({...input, tab: {...tab, tabType: {kind: 'terminal'}}}),
    ).toThrow()
    expect(() =>
      createTabLocation({
        ...input,
        tab: {
          ...tab,
          props: {
            content: {
              ...tab.props.content,
              view: {...tab.props.content.view, tool: {name: 'other.tool'}},
            },
          },
        },
      }),
    ).toThrow()
  })
})
