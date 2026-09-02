import {debounce} from 'es-toolkit/function'
import {createEffect, createSignal, onCleanup, Show, untrack} from 'solid-js'

import type {PuppetParameterValueMap} from '../deformation'
import {createPlayer, type Player, type PlayerFrame, type PuppetDocument} from '../player'
import {markPreparedPuppetDocument} from '../player/internal/prepared-document'
import {EDITOR_VIEWPORT_PADDING} from './internal/viewport'

export type PlayerCanvasStatus = 'error' | 'loading' | 'ready'

const RESIZE_DEBOUNCE_MILLISECONDS = 100

export interface PlayerCanvasProps {
  /** Editor-owned document. Untrusted input must be parsed before reaching this component. */
  readonly document: PuppetDocument
  readonly onFrame?: (frame: PlayerFrame) => void
  readonly onPlayerChange?: (player: Player | null) => void
  readonly onStatusChange?: (status: PlayerCanvasStatus) => void
  readonly parameterValues?: PuppetParameterValueMap
}

export const PlayerCanvas = (props: PlayerCanvasProps) => {
  const [host, setHost] = createSignal<HTMLDivElement>()
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null)
  const [player, setPlayer] = createSignal<Player | null>(null)
  let generation = 0
  const notifyFrame = (frame: PlayerFrame) => untrack(() => props.onFrame)?.(frame)
  const notifyPlayerChange = (nextPlayer: Player | null) =>
    untrack(() => props.onPlayerChange)?.(nextPlayer)

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

  createEffect(() => {
    const currentParameterValues = props.parameterValues
    player()?.setParameterValues(currentParameterValues ?? {})
  })

  createEffect(() => {
    const hostElement = host()
    const onStatusChange = untrack(() => props.onStatusChange)

    if (hostElement === undefined) {
      return
    }

    generation += 1
    const activeGeneration = generation
    onStatusChange?.('loading')
    const preparedDocument = markPreparedPuppetDocument(props.document)
    const currentPlayer = untrack(player)

    try {
      if (currentPlayer?.updateDocument(preparedDocument) === true) {
        setErrorMessage(null)
        onStatusChange?.('ready')
        return
      }
    } catch (error) {
      currentPlayer?.destroy()
      notifyPlayerChange(null)
      setPlayer(null)
      hostElement.replaceChildren()
      setErrorMessage(error instanceof Error ? error.message : '편집 데이터를 적용하지 못했습니다.')
      onStatusChange?.('error')
      return
    }

    const canvasElement = window.document.createElement('canvas')

    currentPlayer?.destroy()
    notifyPlayerChange(null)
    setPlayer(null)
    setErrorMessage(null)
    hostElement.replaceChildren(canvasElement)

    createPlayer({
      canvas: canvasElement,
      document: preparedDocument,
      onFrame: notifyFrame,
      parameterValues: untrack(() => props.parameterValues),
      resizeTo: hostElement,
      viewportPadding: EDITOR_VIEWPORT_PADDING,
    })
      .then((createdPlayer) => {
        if (activeGeneration !== generation) {
          createdPlayer.destroy()
          return
        }

        setPlayer(createdPlayer)
        notifyPlayerChange(createdPlayer)
        onStatusChange?.('ready')
      })
      .catch((error: unknown) => {
        if (activeGeneration !== generation) {
          return
        }

        untrack(player)?.destroy()
        notifyPlayerChange(null)
        setPlayer(null)
        hostElement.replaceChildren()
        setErrorMessage(error instanceof Error ? error.message : '플레이어를 시작하지 못했습니다.')
        onStatusChange?.('error')
      })
  })

  onCleanup(() => {
    generation += 1
    untrack(player)?.destroy()
    notifyPlayerChange(null)
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
