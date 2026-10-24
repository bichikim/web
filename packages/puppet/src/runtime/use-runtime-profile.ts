import {type Accessor, createEffect, createSignal, on} from 'solid-js'
import type {PuppetDocument} from '../player'
import {createRuntimeProfile} from '../tracking/create-runtime-profile'
import {restoreRuntimeProfile} from '../tracking/restore-runtime-profile'
import {parseRuntimeProfile} from '../tracking/parse-runtime-profile'
import type {RuntimeProfile, RuntimeView} from '../tracking/types'
import {isRuntimeViewEqual} from './is-runtime-view-equal'

const sessionKey = (signature: string) => `puppet:runtime-session:v1:${signature}`
const storageKey = (signature: string) => `puppet:runtime-profile:v1:${signature}`

export const useRuntimeProfile = (document: Accessor<PuppetDocument | undefined>) => {
  const [profile, setProfile] = createSignal<RuntimeProfile>()
  const [error, setError] = createSignal<string | null>(null)
  createEffect(
    on(document, (current) => {
      if (current === undefined) {
        setProfile(undefined)
        return
      }
      const defaults = createRuntimeProfile(current)
      try {
        const stored =
          sessionStorage.getItem(sessionKey(defaults.signature)) ??
          localStorage.getItem(storageKey(defaults.signature))
        setProfile(
          stored === null
            ? defaults
            : (restoreRuntimeProfile(JSON.parse(stored), current) ?? defaults),
        )
      } catch (cause) {
        setProfile(defaults)
        setError(cause instanceof Error ? cause.message : '설정을 불러오지 못했습니다.')
      }
    }),
  )
  createEffect(() => {
    const current = profile()
    if (current !== undefined) {
      try {
        sessionStorage.setItem(sessionKey(current.signature), JSON.stringify(current))
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : '세션을 저장하지 못했습니다.')
      }
    }
  })
  const updateProfile = (next: RuntimeProfile) => {
    const current = document()
    const parsed = current === undefined ? undefined : parseRuntimeProfile(next, current)
    if (parsed === undefined) {
      setError('파라미터 범위·중복 연결·단축키를 확인하세요.')
      return
    }
    setProfile(parsed)
  }
  return {
    dismissError: () => setError(null),
    error,
    parseProfile: (value: unknown) => {
      const current = document()
      return current === undefined ? undefined : restoreRuntimeProfile(value, current)
    },
    profile,
    retainCamera: () => {
      const current = profile()
      if (current?.view?.fitted) {
        updateProfile({...current, view: {...current.view, fitted: false}})
      }
    },
    updateProfile,
    updateView: (view: RuntimeView) => {
      const current = profile()
      if (current !== undefined && !isRuntimeViewEqual(current.view, view)) {
        updateProfile({...current, view})
      }
    },
  }
}
