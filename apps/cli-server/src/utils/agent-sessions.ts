import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import type {AgentStreamEvent} from '../types'
import {isPathInsideDirectory} from './safe-path'

interface RawSessionFile {
  readonly sessionId: string
  readonly filePath: string
  readonly updatedAt: Date
}

export interface AgentSessionSummary {
  readonly conversationId: string
  readonly sessionId: string
  readonly title: string
  readonly cwd: string | null
  readonly updatedAt: string
}

const CURSOR_PROJECTS_DIRECTORY = path.join(os.homedir(), '.cursor', 'projects')

const MAX_SESSION_TITLE_LENGTH = 120
const SAFE_SESSION_ID_PATTERN = /^[\w-]+$/u

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const normalizeLineBreaks = (value: string): string =>
  value.replaceAll('\r\n', '\n').replaceAll('\r', '\n')

const workspacePathToProjectKey = (workspacePath: string): string =>
  path
    .resolve(workspacePath)
    .split(path.sep)
    .filter((segment) => segment !== '')
    .join('-')

const sanitizeSessionTitle = (value: string): string =>
  value
    .replace(/<[^>]+>/gu, ' ')
    .replaceAll(/\s+/gu, ' ')
    .trim()
    .slice(0, MAX_SESSION_TITLE_LENGTH)

const mergeTranscriptEventIntoSessionState = (
  event: Record<string, unknown>,
  state: {sessionCwd: string | null; title: string},
): void => {
  if (event.type === 'system' && event.subtype === 'init' && typeof event.cwd === 'string') {
    state.sessionCwd = event.cwd
  }

  if (event.role === 'user' && state.title === 'Untitled') {
    const contentList = (event.message as {content?: unknown})?.content

    if (Array.isArray(contentList)) {
      state.title = parseFirstUserTextTitle(contentList) ?? state.title
    }
  }
}

const parseFirstUserTextTitle = (contentList: readonly unknown[]): string | undefined => {
  for (const contentItem of contentList) {
    if (
      isRecord(contentItem) &&
      contentItem.type === 'text' &&
      typeof contentItem.text === 'string'
    ) {
      const cleaned = sanitizeSessionTitle(contentItem.text)
      if (cleaned !== '') {
        return cleaned
      }
    }
  }

  return undefined
}

const resolveTranscriptDirectory = (workspacePath: string): string =>
  path.join(
    CURSOR_PROJECTS_DIRECTORY,
    workspacePathToProjectKey(workspacePath),
    'agent-transcripts',
  )

export const isSafeAgentSessionId = (sessionId: string): boolean =>
  SAFE_SESSION_ID_PATTERN.test(sessionId)

const hasTranscriptDirectory = async (workspacePath: string): Promise<boolean> => {
  const transcriptDirectory = resolveTranscriptDirectory(workspacePath)

  try {
    const stats = await fs.stat(transcriptDirectory)
    return stats.isDirectory()
  } catch {
    return false
  }
}

const collectAncestorPaths = (from: string, stopAt: string): string[] => {
  const resolvedStopAt = path.resolve(stopAt)
  const paths: string[] = []
  let current = path.resolve(from)

  while (true) {
    paths.push(current)
    if (current === resolvedStopAt) {
      break
    }

    const parent = path.dirname(current)
    if (parent === current) {
      break
    }

    current = parent
  }

  return paths
}

export const resolveWorkspaceWithTranscripts = async ({
  workspaceRoot,
  workingDirectory,
}: {
  workspaceRoot: string
  workingDirectory: string
}): Promise<string> => {
  const resolvedWorkspaceRoot = path.resolve(workspaceRoot)
  const workingDirectoryResolved = path.resolve(workingDirectory)

  if (
    !isPathInsideDirectory({
      directoryPath: resolvedWorkspaceRoot,
      targetPath: workingDirectoryResolved,
    })
  ) {
    return resolvedWorkspaceRoot
  }

  const ancestorPathList = collectAncestorPaths(workingDirectoryResolved, resolvedWorkspaceRoot)
  const transcriptChecks = await Promise.all(
    ancestorPathList.map((directoryPath) => hasTranscriptDirectory(directoryPath)),
  )
  const foundIndex = transcriptChecks.findIndex(Boolean)

  if (foundIndex >= 0) {
    return ancestorPathList[foundIndex]!
  }

  return resolvedWorkspaceRoot
}

const listSessionFiles = async (transcriptDirectory: string): Promise<RawSessionFile[]> => {
  const directoryEntries = await fs.readdir(transcriptDirectory, {withFileTypes: true})
  const sessionDirectories = directoryEntries.filter((directoryEntry) =>
    directoryEntry.isDirectory(),
  )

  const sessionFilesOrUndefined = await Promise.all(
    sessionDirectories.map(async (directoryEntry) => {
      const sessionId = directoryEntry.name
      const filePath = path.join(transcriptDirectory, sessionId, `${sessionId}.jsonl`)

      try {
        const stats = await fs.stat(filePath)
        if (!stats.isFile()) {
          return undefined
        }

        return {filePath, sessionId, updatedAt: stats.mtime} as const
      } catch {
        return undefined
      }
    }),
  )

  const collected = sessionFilesOrUndefined.filter(
    (sessionFile): sessionFile is RawSessionFile => sessionFile !== undefined,
  )

  return collected.sort(
    (sessionA, sessionB) => sessionB.updatedAt.getTime() - sessionA.updatedAt.getTime(),
  )
}

const extractSessionSummary = async (sessionFile: RawSessionFile): Promise<AgentSessionSummary> => {
  const fileContent = await fs.readFile(sessionFile.filePath, 'utf8')
  const lines = normalizeLineBreaks(fileContent).split('\n')

  const state = {sessionCwd: null as string | null, title: 'Untitled'}

  for (const line of lines) {
    const trimmedLine = line.trim()
    if (trimmedLine !== '') {
      try {
        const event = JSON.parse(trimmedLine) as AgentStreamEvent | Record<string, unknown>
        if (isRecord(event)) {
          mergeTranscriptEventIntoSessionState(event, state)
        }
      } catch {
        // ignore malformed line
      }

      if (state.sessionCwd !== null && state.title !== 'Untitled') {
        break
      }
    }
  }

  return {
    conversationId: sessionFile.sessionId,
    cwd: state.sessionCwd,
    sessionId: sessionFile.sessionId,
    title: state.title,
    updatedAt: sessionFile.updatedAt.toISOString(),
  }
}

export const listSessionsByWorkingDirectory = async (
  workspaceRoot: string,
  workingDirectory: string,
): Promise<readonly AgentSessionSummary[]> => {
  const workspaceForTranscripts = await resolveWorkspaceWithTranscripts({
    workingDirectory,
    workspaceRoot,
  })
  const transcriptDirectory = resolveTranscriptDirectory(workspaceForTranscripts)
  const sessionFiles = await listSessionFiles(transcriptDirectory)
  const summaries = await Promise.all(
    sessionFiles.map((sessionFile) => extractSessionSummary(sessionFile)),
  )
  const resolvedWorkingDirectory = path.resolve(workingDirectory)

  return summaries.filter(
    (summary) =>
      summary.cwd === null ||
      isPathInsideDirectory({
        directoryPath: resolvedWorkingDirectory,
        targetPath: summary.cwd,
      }),
  )
}

export const resolveAgentSessionJsonlFilePath = async ({
  workspaceRoot,
  workingDirectory,
  sessionId,
}: {
  workspaceRoot: string
  workingDirectory: string
  sessionId: string
}): Promise<string | undefined> => {
  if (!isSafeAgentSessionId(sessionId)) {
    return
  }

  const workspaceForTranscripts = await resolveWorkspaceWithTranscripts({
    workingDirectory,
    workspaceRoot,
  })
  const transcriptDirectory = resolveTranscriptDirectory(workspaceForTranscripts)
  const filePath = path.join(transcriptDirectory, sessionId, `${sessionId}.jsonl`)

  if (!isPathInsideDirectory({directoryPath: transcriptDirectory, targetPath: filePath})) {
    return
  }

  try {
    const stats = await fs.stat(filePath)
    if (!stats.isFile()) {
      return
    }

    return filePath
  } catch {
    // missing or unreadable session file
  }
}
