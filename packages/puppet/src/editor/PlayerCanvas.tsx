import {createEffect, createSignal, onCleanup, Show, untrack} from 'solid-js'

import {
  createPlayer,
  parseDocument,
  type Player,
  type PuppetDocument,
  serializeDocument,
} from '../player'
import {EDITOR_VIEWPORT_PADDING} from './internal/viewport'

export type PlayerCanvasStatus = 'error' | 'loading' | 'ready'

export interface PlayerCanvasProps {
  readonly document: PuppetDocument
  readonly onStatusChange?: (status: PlayerCanvasStatus) => void
}

export const PlayerCanvas = (props: PlayerCanvasProps) => {
  const [host, setHost] = createSignal<HTMLDivElement>()
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null)
  const [player, setPlayer] = createSignal<Player | null>(null)
  let generation = 0

  createEffect(() => {
    const hostElement = host()
    const parsedDocument = parseDocument(serializeDocument(props.document))
    const onStatusChange = untrack(() => props.onStatusChange)

    if (hostElement === undefined) {
      return
    }

    if (!parsedDocument.ok) {
      setErrorMessage('편집 데이터를 플레이어 문서로 변환하지 못했습니다.')
      onStatusChange?.('error')
      return
    }

    const currentPlayer = untrack(player)

    if (currentPlayer?.updateDocument(parsedDocument.document) === true) {
      setErrorMessage(null)
      onStatusChange?.('ready')
      return
    }

    generation += 1
    const activeGeneration = generation
    const canvasElement = window.document.createElement('canvas')

    currentPlayer?.destroy()
    setPlayer(null)
    setErrorMessage(null)
    onStatusChange?.('loading')
    hostElement.replaceChildren(canvasElement)

    createPlayer({
      canvas: canvasElement,
      document: parsedDocument.document,
      resizeTo: hostElement,
      viewportPadding: EDITOR_VIEWPORT_PADDING,
    })
      .then((createdPlayer) => {
        if (activeGeneration !== generation) {
          createdPlayer.destroy()
          return
        }

        setPlayer(createdPlayer)
        onStatusChange?.('ready')
      })
      .catch((error: unknown) => {
        if (activeGeneration !== generation) {
          return
        }

        setErrorMessage(error instanceof Error ? error.message : '플레이어를 시작하지 못했습니다.')
        onStatusChange?.('error')
      })
  })

  onCleanup(() => {
    generation += 1
    untrack(player)?.destroy()
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
