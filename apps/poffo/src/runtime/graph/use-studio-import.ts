import {createEffect, createMemo, onCleanup} from 'solid-js'
import type {RuntimeProfile} from '../../tracking/types'
import type {RuntimeControls} from '../use-runtime-controls'
import {parseStudioFile} from './parse-studio-file'
import type {WorkspaceLayout} from './workspace-layout'

interface UseStudioImportOptions {
  readonly controls: RuntimeControls
  readonly reportError: (message: string | null) => void
  readonly restore: (layout: WorkspaceLayout, profile: RuntimeProfile) => void
}

/** Only the current file read may apply to the model that accepted it. */
export const useStudioImport = (options: UseStudioImportOptions) => {
  let disposed = false
  let active: symbol | undefined
  const signature = createMemo(() => options.controls.profile()?.signature)
  createEffect(
    signature,
    () => {
      if (active !== undefined) {
        active = undefined
        options.reportError('모델이 바뀌었습니다. 스튜디오 파일을 다시 선택해 주세요.')
      }
    },
    {defer: true},
  )
  onCleanup(() => {
    disposed = true
    active = undefined
  })

  return async (file: File) => {
    const originalSignature = signature()
    if (disposed || originalSignature === undefined) {
      return
    }
    const request = Symbol()
    active = request
    options.reportError(null)
    try {
      const text = await file.text()
      const currentProfile = options.controls.profile()
      if (active !== request || currentProfile?.signature !== originalSignature) {
        return
      }
      const value: unknown = JSON.parse(text)
      const result = parseStudioFile({
        currentProfile,
        parseProfile: options.controls.parseProfile,
        value,
      })
      if (result === undefined) {
        throw new Error('현재 모델과 스튜디오 파일이 맞지 않습니다.')
      }
      if (result.layout === undefined) {
        options.controls.updateProfile(result.profile)
      } else {
        options.restore(result.layout, result.profile)
      }
    } catch (cause) {
      if (active === request && signature() === originalSignature) {
        options.reportError(
          cause instanceof Error ? cause.message : '스튜디오를 불러오지 못했습니다.',
        )
      }
    } finally {
      if (active === request) {
        active = undefined
      }
    }
  }
}
