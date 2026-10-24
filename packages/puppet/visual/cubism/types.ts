import type {PuppetDocument} from '../../src/player/document'
import type {PuppetParameterValueMap} from '../../src/deformation'

/** 개발 비교 화면에서만 사용하는 SDK 렌더러 경계. */
export interface Reference {
  destroy(): void
  draw(): void
  reset(motionId: string | null): void
  resize(width: number, height: number): void
  step(time: number, deltaTime: number, overrides: PuppetParameterValueMap): void
  values(): PuppetParameterValueMap
}

export interface ReferenceOptions {
  /** SDK 캔버스. 생성한 WebGL 자원은 destroy에서 해제한다. */
  readonly canvas: HTMLCanvasElement
  /** SDK Framework의 src 디렉터리 URL. 끝에 /를 포함한다. */
  readonly frameworkUrl: string
  /** 같은 모델을 변환한 Poffo 문서의 뷰포트와 모션 페이드. */
  readonly document: PuppetDocument
  /** 공식 Web Samples를 제공하는 서버 원점. */
  readonly sdkOrigin: string
  /** 초기화 취소 신호. */
  readonly signal: AbortSignal
}

export interface ComparisonFrame {
  readonly duration: number
  readonly motionId: string | null
  readonly time: number
  readonly sdkValues: PuppetParameterValueMap
  readonly poffoValues: PuppetParameterValueMap
  readonly overrides: PuppetParameterValueMap
}

export interface ComparisonSnapshot extends ComparisonFrame {
  readonly playing: boolean
}

export interface Comparison {
  destroy(): void
  pause(): void
  play(): void
  seek(time: number): void
  select(motionId: string | null): void
  setParameter(id: string, value: number | undefined): void
  clearParameters(): void
}

export interface ComparisonOptions extends ReferenceOptions {
  /** Poffo가 그릴 캔버스. SDK 캔버스와 같은 표시 크기로 배치한다. */
  readonly poffoCanvas: HTMLCanvasElement
  /** Poffo의 크기를 결정하는 호스트. ResizeObserver는 destroy에서 해제한다. */
  readonly host: HTMLElement
  /** 두 모델을 같은 시간으로 평가한 뒤 호출한다. */
  readonly onFrame: (snapshot: ComparisonSnapshot) => void
  /** 재생 중 오류가 발생했을 때 호출한다. 초기화 오류는 호출자에게 던진다. */
  readonly onError: (error: unknown) => void
}
