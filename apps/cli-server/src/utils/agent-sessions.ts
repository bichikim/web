import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import type {AgentStreamEvent} from '../types'

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
    .replace(/<[^>]+>/g, ' ')
    .replaceAll(/\s+/g, ' ')
    .trim()
    .slice(0, 120)

const resolveTranscriptDirectory = (workspacePath: string): string =>
  path.join(
    CURSOR_PROJECTS_DIRECTORY,
    workspacePathToProjectKey(workspacePath),
    'agent-transcripts',
  )

const hasTranscriptDirectory = async (workspacePath: string): Promise<boolean> => {
  const transcriptDirectory = resolveTranscriptDirectory(workspacePath)

  try {
    const stats = await fs.stat(transcriptDirectory)
    return stats.isDirectory()
  } catch {
    return false
  }
}

export const resolveWorkspaceWithTranscripts = async ({
  workspaceRoot,
  workingDirectory,
}: {
  workspaceRoot: string
  workingDirectory: string
}): Promise<string> => {
  const resolvedWorkspaceRoot = path.resolve(workspaceRoot)
  let current = path.resolve(workingDirectory)

  while (true) {
    if (await hasTranscriptDirectory(current)) {
      return current
    }

    if (current === resolvedWorkspaceRoot) {
      break
    }

    const parent = path.dirname(current)
    if (parent === current) {
      break
    }

    current = parent
  }

  return resolvedWorkspaceRoot
}

const listSessionFiles = async (transcriptDirectory: string): Promise<RawSessionFile[]> => {
  const directoryEntries = await fs.readdir(transcriptDirectory, {withFileTypes: true})
  const collected: RawSessionFile[] = []

  for (const directoryEntry of directoryEntries) {
    if (!directoryEntry.isDirectory()) {
      continue
    }

    const sessionId = directoryEntry.name
    const filePath = path.join(transcriptDirectory, sessionId, `${sessionId}.jsonl`)

    try {
      const stats = await fs.stat(filePath)
      if (!stats.isFile()) {
        continue
      }

      collected.push({sessionId, filePath, updatedAt: stats.mtime})
    } catch {
      continue
    }
  }

  return collected.sort(
    (sessionA, sessionB) => sessionB.updatedAt.getTime() - sessionA.updatedAt.getTime(),
  )
}

const extractSessionSummary = async (sessionFile: RawSessionFile): Promise<AgentSessionSummary> => {
  const fileContent = await fs.readFile(sessionFile.filePath, 'utf8')
  const lines = normalizeLineBreaks(fileContent).split('\n')

  let title = 'Untitled'
  let sessionCwd: string | null = null

  for (const line of lines) {
    const trimmedLine = line.trim()
    if (trimmedLine === '') {
      continue
    }

    try {
      const event = JSON.parse(trimmedLine) as AgentStreamEvent | Record<string, unknown>
      if (!isRecord(event)) {
        continue
      }

      if (event.type === 'system' && event.subtype === 'init' && typeof event.cwd === 'string') {
        sessionCwd = event.cwd
      }

      if (event.role === 'user' && title === 'Untitled') {
        const contentList = (event.message as {content?: unknown})?.content

        if (Array.isArray(contentList)) {
          for (const contentItem of contentList) {
            if (
              !isRecord(contentItem) ||
              contentItem.type !== 'text' ||
              typeof contentItem.text !== 'string'
            ) {
              continue
            }

            const cleaned = sanitizeSessionTitle(contentItem.text)
            if (cleaned !== '') {
              title = cleaned
              break
            }
          }
        }
      }
    } catch {
      continue
    }

    if (sessionCwd !== null && title !== 'Untitled') {
      break
    }
  }

  return {
    conversationId: sessionFile.sessionId,
    sessionId: sessionFile.sessionId,
    title,
    cwd: sessionCwd,
    updatedAt: sessionFile.updatedAt.toISOString(),
  }
}

export const listSessionsByWorkingDirectory = async (
  workspaceRoot: string,
  workingDirectory: string,
): Promise<readonly AgentSessionSummary[]> => {
  const workspaceForTranscripts = await resolveWorkspaceWithTranscripts({
    workspaceRoot,
    workingDirectory,
  })
  const transcriptDirectory = resolveTranscriptDirectory(workspaceForTranscripts)
  const sessionFiles = await listSessionFiles(transcriptDirectory)
  const summaries = await Promise.all(
    sessionFiles.map((sessionFile) => extractSessionSummary(sessionFile)),
  )
  const resolvedWorkingDirectory = path.resolve(workingDirectory)

  return summaries.filter(
    (summary) => summary.cwd === null || summary.cwd.startsWith(resolvedWorkingDirectory),
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
  const workspaceForTranscripts = await resolveWorkspaceWithTranscripts({
    workspaceRoot,
    workingDirectory,
  })
  const transcriptDirectory = resolveTranscriptDirectory(workspaceForTranscripts)
  const filePath = path.join(transcriptDirectory, sessionId, `${sessionId}.jsonl`)

  try {
    const stats = await fs.stat(filePath)
    if (!stats.isFile()) {
      return
    }

    return filePath
  } catch {
    return
  }
}
