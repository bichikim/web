import {usePlayerMotion} from '../workspace/use-player-motion'
import {debounce} from 'es-toolkit/function'
import {
  type Accessor,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  Show,
  untrack,
} from 'solid-js'

import type {PuppetParameterValueMap} from '../deformation'
import {type Player, type PlayerFrame, type PuppetDocument} from '../player'
import {markPreparedPuppetDocument} from '../player/internal/prepared-document'
import type {SpatialThreeSurface} from './internal/spatial-three-overlay'
import {useSpatialOverlay} from './internal/use-spatial-overlay'
import {createCanvasPlayer} from './create-canvas-player'
import {applyPlayerDocument} from './apply-player-document'

export type PlayerCanvasStatus = 'error' | 'loading' | 'ready'

const RESIZE_DEBOUNCE_MILLISECONDS = 100
export interface PlayerCanvasProps {
  /** Editor-owned document. Untrusted input must be parsed before reaching this component. */
  readonly document: PuppetDocument
  /** Position reapplied after a compatible document update; omitted, retain normal document-change behavior. */
  readonly resumeTime?: number
  readonly motionId?: string
  /** 가져온 표정 ID. 생략하면 모션과 수동 파라미터만 사용한다. */
  readonly expressionId?: string
  readonly onFrame?: (frame: PlayerFrame) => void
  readonly onPlayerChange?: (player: Player | null) => void
  readonly onStatusChange?: (status: PlayerCanvasStatus) => void
  readonly parameterValues?: PuppetParameterValueMap
  readonly physicsPreview?: boolean
  readonly spatialSurface?: SpatialThreeSurface
}

const usePlayerResize = (
  host: Accessor<HTMLDivElement | undefined>,
  player: Accessor<Player | null>,
) => {
  createEffect(() => {
    const hostElement = host()

    if (hostElement === undefined || typeof ResizeObserver === 'undefined') {
      return
    }

    const resizePlayer = debounce(() => untrack(player)?.resize(), RESIZE_DEBOUNCE_MILLISECONDS)
    const resizeObserver = new ResizeObserver(resizePlayer)

    resizeObserver.observe(hostElement)
    onCleanup(() => {
      resizeObserver.disconnect()
      resizePlayer.cancel()
    })
  })
}

export const PlayerCanvas = (props: PlayerCanvasProps) => {
  const sourceDocument = createMemo(() => props.document)
  const [host, setHost] = createSignal<HTMLDivElement>()
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null)
  const [player, setPlayer] = createSignal<Player | null>(null)
  let generation = 0
  let pending = false
  let initializingPlayer: Player | undefined
  const [retry, setRetry] = createSignal(0)
  let appliedDocument: PuppetDocument | undefined
  let playerCanvas: HTMLCanvasElement | undefined
  const overlay = useSpatialOverlay({
    canvas: () => playerCanvas,
    onError: setErrorMessage,
    player,
    surface: () => props.spatialSurface,
  })
  const notifyFrame = (frame: PlayerFrame) => untrack(() => props.onFrame?.(frame))
  const notifyPlayerChange = (nextPlayer: Player | null) =>
    untrack(() => props.onPlayerChange?.(nextPlayer))
  const notifyStatus = (status: PlayerCanvasStatus) => untrack(() => props.onStatusChange?.(status))
  const disposePlayer = () => {
    overlay.dispose()
    untrack(player)?.destroy()
    notifyPlayerChange(null)
    setPlayer(null)
    untrack(host)?.replaceChildren()
  }

  usePlayerResize(host, player)

  createEffect(() => {
    const currentParameterValues = props.parameterValues
    const document = sourceDocument()
    const currentPlayer = player()
    if (appliedDocument === document) {
      currentPlayer?.setParameterValues(currentParameterValues ?? {})
    }
  })

  createEffect(() => {
    const physicsPreview = props.physicsPreview ?? true
    player()?.setPhysicsPreview(physicsPreview)
  })

  usePlayerMotion({motionId: () => props.motionId, player})
  createEffect(() => {
    const current = player()
    const expression = props.expressionId
    if (current !== null) {
      current.setExpression(expression)
    }
  })

  createEffect(() => {
    const hostElement = host()

    if (hostElement === undefined) {
      return
    }

    const nextDocument = sourceDocument()
    retry()
    if (pending) {
      return
    }
    generation += 1
    const activeGeneration = generation
    notifyStatus('loading')
    const preparedDocument = markPreparedPuppetDocument(nextDocument)
    const currentPlayer = untrack(player)
    try {
      if (
        currentPlayer !== null &&
        untrack(() => applyPlayerDocument(currentPlayer, nextDocument, props, appliedDocument))
      ) {
        appliedDocument = nextDocument
        setErrorMessage(null)
        notifyStatus('ready')
        return
      }
    } catch (error) {
      disposePlayer()
      setErrorMessage(error instanceof Error ? error.message : '편집 데이터를 적용하지 못했습니다.')
      notifyStatus('error')
      return
    }

    const canvasElement = (<canvas aria-label="모델 뷰어" />) as HTMLCanvasElement

    disposePlayer()
    setErrorMessage(null)
    hostElement.replaceChildren(canvasElement)
    playerCanvas = canvasElement

    pending = true
    createCanvasPlayer({
      canvas: canvasElement,
      document: preparedDocument,
      host: hostElement,
      motionId: untrack(() => props.motionId),
      onAfterRender: overlay.render,
      onBeforeRender: overlay.prepare,
      onFrame: notifyFrame,
      parameterValues: untrack(() => props.parameterValues),
      physicsPreview: untrack(() => props.physicsPreview),
    })
      .then((createdPlayer) => {
        pending = false
        if (activeGeneration !== generation) {
          createdPlayer.destroy()
          return
        }

        initializingPlayer = createdPlayer
        const latest = untrack(sourceDocument)
        if (
          latest !== nextDocument &&
          !untrack(() => applyPlayerDocument(createdPlayer, latest, props, nextDocument))
        ) {
          createdPlayer.destroy()
          initializingPlayer = undefined
          setRetry((value) => value + 1)
          return
        }
        appliedDocument = latest
        initializingPlayer = undefined
        setPlayer(createdPlayer)
        notifyPlayerChange(createdPlayer)
        notifyStatus('ready')
      })
      .catch((error: unknown) => {
        pending = false
        if (activeGeneration !== generation) {
          return
        }

        initializingPlayer?.destroy()
        initializingPlayer = undefined
        disposePlayer()
        setErrorMessage(error instanceof Error ? error.message : '플레이어를 시작하지 못했습니다.')
        notifyStatus('error')
      })
  })

  onCleanup(() => {
    generation += 1
    disposePlayer()
  })

  return (
    <div class="player-canvas">
      <div class="canvas-host" ref={setHost} />
      <Show when={errorMessage()}>
        {(message) => <p class="viewport-message error-message">{message()}</p>}
      </Show>
    </div>
  )
}
