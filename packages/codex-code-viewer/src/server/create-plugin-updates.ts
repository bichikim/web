import type {PluginUpdate} from '../shared/plugin-updates'
import {compareVersions} from '../shared/compare-versions'

export interface PluginUpdatePort {
  /** 배포된 최신 버전을 조회한다. 조회 실패 시 예외를 전달한다. */
  readonly readLatest: () => Promise<string>
  /** 확인된 버전을 대상 호스트에 설치한다. 설치 실패 시 예외를 전달한다. */
  readonly install: (version: string) => Promise<void>
}
export interface PluginUpdatesOptions {
  /** 현재 실행 중인 플러그인의 버전이다. */
  readonly current: string
  /** 설치 대상 호스트이며 결과의 재시작 안내에 사용한다. */
  readonly target: PluginUpdate['target']
  /** 버전 조회와 대상 호스트 설치를 수행하는 I/O 경계다. */
  readonly port: PluginUpdatePort
}
export interface PluginUpdates {
  /** 최신 버전을 확인하며 설치 중이거나 설치가 끝났으면 해당 상태를 반환한다. */
  readonly check: () => Promise<PluginUpdate>
  /** 확인된 새 버전만 설치한다. 미확인 버전이나 I/O 실패 시 예외를 전달한다. */
  readonly install: (version: string) => Promise<PluginUpdate>
}

/** npm 최신 버전을 확인하고 확인된 버전만 설치한다. 설치 완료 상태는 재시작까지 유지한다. */
export const createPluginUpdates = ({
  current,
  port,
  target,
}: PluginUpdatesOptions): PluginUpdates => {
  let checked: PluginUpdate | null = null
  let checking: Promise<PluginUpdate> | null = null
  let pending: Promise<PluginUpdate> | null = null
  const refresh = async (): Promise<PluginUpdate> => {
    const latest = await port.readLatest()
    if (pending !== null) {
      return pending
    }
    if (checked?.status === 'installed') {
      return checked
    }
    checked = {
      current,
      latest,
      status: compareVersions(latest, current) > 0 ? 'available' : 'current',
      target,
    }
    return checked
  }
  const check = async (): Promise<PluginUpdate> => {
    if (pending !== null) {
      return pending
    }
    if (checked?.status === 'installed') {
      return checked
    }
    if (checking !== null) {
      return checking
    }
    checking = refresh()
    try {
      return await checking
    } finally {
      checking = null
    }
  }
  const install = async (latest: string): Promise<PluginUpdate> => {
    if (checked === null || checked.latest !== latest || checked.status === 'current') {
      throw new Error('확인된 새 버전만 설치할 수 있습니다.')
    }
    if (checked.status === 'installed') {
      return checked
    }
    if (pending !== null) {
      return pending
    }
    const release = checked
    pending = port.install(latest).then(() => {
      checked = {...release, status: 'installed'}
      return checked
    })
    try {
      return await pending
    } finally {
      pending = null
    }
  }
  return {check, install}
}
