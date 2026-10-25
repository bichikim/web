import {readFileSync, statSync} from 'node:fs'
import {isAbsolute, join} from 'node:path'
import {z} from 'zod'
import {failure, type Result, success} from '../shared/contracts'
import {readThreadWorkspace} from './read-thread-workspace'

interface ReadCodexWorkspaceOptions {
  /** Codex 설정과 채팅 DB가 저장된 디렉터리입니다. */
  readonly home: string
  /** 호출한 채팅의 ID를 포함하는 호스트 메타데이터입니다. */
  readonly metadata: unknown
}

const selectionSchema = z.object({
  'local-projects': z.record(z.string(), z.unknown()),
  'selected-project': z.object({projectId: z.string(), type: z.literal('local')}),
})
const projectSchema = z.object({rootPaths: z.array(z.string())})

const readSelectedWorkspace = (home: string): Result<string | undefined> => {
  try {
    const settings = selectionSchema.safeParse(
      JSON.parse(readFileSync(join(home, '.codex-global-state.json'), 'utf8')),
    )
    if (!settings.success) {
      return success(undefined)
    }
    const project = projectSchema.safeParse(
      settings.data['local-projects'][settings.data['selected-project'].projectId],
    )
    const path = project.success ? project.data.rootPaths[0] : undefined
    return success(
      path !== undefined && isAbsolute(path) && statSync(path).isDirectory() ? path : undefined,
    )
  } catch (error) {
    return error instanceof SyntaxError ||
      (error instanceof Error &&
        'code' in error &&
        (error.code === 'ENOENT' || error.code === 'ENOTDIR'))
      ? success(undefined)
      : failure('read-failed')
  }
}

/** 채팅의 작업 경로를 우선하고, 아직 없으면 로컬 설정의 선택된 프로젝트 폴더를 읽습니다. */
export const readCodexWorkspace = (
  options: ReadCodexWorkspaceOptions,
): Result<string | undefined> => {
  const thread = readThreadWorkspace(options)
  return !thread.ok || thread.value !== undefined ? thread : readSelectedWorkspace(options.home)
}
