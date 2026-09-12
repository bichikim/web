export interface UnsupportedRemoteError {
  readonly code: 'unsupported-remote'
  readonly remote: string
}

export interface RepositoryIdFailure {
  readonly error: UnsupportedRemoteError
  readonly ok: false
}

export interface RepositoryIdSuccess {
  readonly ok: true
  readonly value: string
}

export type RepositoryIdResult = RepositoryIdFailure | RepositoryIdSuccess

interface RemoteParts {
  readonly host: string
  readonly path: string
}

const SUPPORTED_PROTOCOLS = new Set(['git:', 'http:', 'https:', 'ssh:'])
const SCP_REMOTE_PATTERN = /^(?:[^@/\s]+@)?(?<host>[^:/\s]+):(?<path>.+)$/u

const failure = (remote: string): RepositoryIdFailure => ({
  error: {
    code: 'unsupported-remote',
    remote,
  },
  ok: false,
})

const normalizePath = (path: string): string =>
  path.replace(/^\/+|\/+$/gu, '').replace(/\.git$/u, '')

const parseUrlRemote = (remote: string): RemoteParts | undefined => {
  try {
    const url = new URL(remote)

    if (!SUPPORTED_PROTOCOLS.has(url.protocol) || url.hostname === '') {
      return undefined
    }

    const host =
      url.port === '' ? url.hostname.toLowerCase() : `${url.hostname.toLowerCase()}:${url.port}`

    return {
      host,
      path: normalizePath(url.pathname),
    }
  } catch {
    return undefined
  }
}

const parseScpRemote = (remote: string): RemoteParts | undefined => {
  const match = SCP_REMOTE_PATTERN.exec(remote)

  if (match === null) {
    return undefined
  }

  const {host, path} = match.groups ?? {}

  if (host === undefined || path === undefined) {
    return undefined
  }

  return {
    host: host.toLowerCase(),
    path: normalizePath(path),
  }
}

export const parseRepositoryId = (remote: string): RepositoryIdResult => {
  const normalizedRemote = remote.trim()

  if (normalizedRemote === '' || normalizedRemote.includes('\\')) {
    return failure(remote)
  }

  const parts = normalizedRemote.includes('://')
    ? parseUrlRemote(normalizedRemote)
    : parseScpRemote(normalizedRemote)

  if (parts === undefined || parts.path === '') {
    return failure(remote)
  }

  return {
    ok: true,
    value: `${parts.host}/${parts.path}`,
  }
}
