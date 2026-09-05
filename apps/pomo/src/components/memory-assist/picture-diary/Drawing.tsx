import {Tabs} from '@kobalte/core/tabs'
import {clientOnly} from '@solidjs/start'
import {createSignal, Show} from 'solid-js'
import * as m from '@paraglide/message'
import type {PictureDiaryImage, PictureDiaryStroke} from '../../../features/picture-diary'
import {PButton} from '../../PButton'
import {PModal} from '../../PModal'
import {PModalTabList} from '../../PModalTabList'
import {PictureDiaryCanvas} from './Canvas'
import './drawing.css'

const Generation = clientOnly(() => import('./Generation'), {lazy: true})

export interface PictureDiaryDrawingProps {
  readonly image?: PictureDiaryImage
  readonly onImageChange?: (image: PictureDiaryImage | undefined) => void
  readonly idea?: string
  readonly strokes: ReadonlyArray<PictureDiaryStroke>
  readonly onChange?: (strokes: ReadonlyArray<PictureDiaryStroke>) => void
  readonly disabled?: boolean
}

const getDrawingModes = (withGeneration: boolean) => [
  {icon: 'i-tabler-pencil', label: m.picture_diary_draw(), value: 'draw'},
  ...(withGeneration
    ? [{icon: 'i-tabler-sparkles', label: m.picture_diary_generate(), value: 'generate'}]
    : []),
]

export const PictureDiaryDrawing = (props: PictureDiaryDrawingProps) => {
  const [preview, setPreview] = createSignal<PictureDiaryImage>()
  const [generating, setGenerating] = createSignal(false)
  const [generationVisited, setGenerationVisited] = createSignal(false)
  const [mode, setMode] = createSignal<'draw' | 'generate'>('draw')
  const [isOpen, setIsOpen] = createSignal(false)
  const [limitReached, setLimitReached] = createSignal(false)
  const [trigger, setTrigger] = createSignal<HTMLButtonElement>()
  return (
    <>
      <button
        aria-label={m.picture_diary_edit_drawing()}
        aria-haspopup="dialog"
        class="picture-diary-drawing__trigger"
        disabled={props.disabled}
        onClick={() => {
          setGenerationVisited(mode() === 'generate')
          setIsOpen(true)
        }}
        ref={setTrigger}
        type="button"
      >
        <PictureDiaryCanvas readOnly strokes={props.strokes} image={props.image} />
      </button>
      <Tabs
        class="contents"
        value={mode()}
        onChange={(value) => {
          if (value === 'draw' || value === 'generate') {
            if (value === 'generate') {
              setGenerationVisited(true)
            }
            setMode(value)
          }
        }}
      >
        <PModal
          navigation={
            <PModalTabList
              accessibleLabel={m.picture_diary_picture_method()}
              items={getDrawingModes(props.onImageChange !== undefined)}
            />
          }
          isOpen={isOpen()}
          onOpenChange={setIsOpen}
          onCloseAutoFocus={() => trigger()?.focus()}
          size="wide"
          title={m.picture_diary_edit_drawing()}
          titleVisibility="visually-hidden"
          footer={
            <div class="picture-diary-drawing__actions">
              <Show when={mode() === 'draw'}>
                <PButton
                  children={null}
                  accessibleLabel={m.picture_diary_undo()}
                  icon="i-tabler-arrow-back-up"
                  size="small"
                  tone="secondary"
                  disabled={props.strokes.length === 0}
                  onPress={() => {
                    props.onChange?.(props.strokes.slice(0, -1))
                    setLimitReached(false)
                  }}
                />
                <PButton
                  children={null}
                  accessibleLabel={m.picture_diary_clear()}
                  icon="i-tabler-eraser"
                  size="small"
                  tone="secondary"
                  disabled={props.strokes.length === 0}
                  onPress={() => {
                    props.onChange?.([])
                    setLimitReached(false)
                  }}
                />
              </Show>
              <PButton
                class="picture-diary-drawing__done"
                size="small"
                disabled={mode() === 'generate' && generating()}
                onPress={() => {
                  const image = preview()
                  if (mode() === 'generate' && image !== undefined) {
                    props.onImageChange?.(image)
                  }
                  setIsOpen(false)
                }}
              >
                {m.picture_diary_drawing_done()}
              </PButton>
            </div>
          }
        >
          <Show when={props.image && props.onImageChange}>
            <div class="mb-3">
              <PButton
                size="small"
                tone="secondary"
                onPress={() => props.onImageChange?.(undefined)}
              >
                {m.picture_diary_remove_image()}
              </PButton>
            </div>
          </Show>
          <Tabs.Content value="draw" aria-label={m.picture_diary_draw()}>
            <div class="picture-diary-drawing__surface">
              <PictureDiaryCanvas
                image={props.image}
                strokes={props.strokes}
                onChange={props.onChange}
                onLimit={() => setLimitReached(true)}
              />
            </div>
            <Show when={limitReached()}>
              <p role="status">{m.picture_diary_drawing_limit()}</p>
            </Show>
          </Tabs.Content>
          <Tabs.Content
            forceMount
            hidden={mode() !== 'generate'}
            value="generate"
            aria-label={m.picture_diary_generate()}
          >
            <Show when={isOpen() && generationVisited()}>
              <Generation
                initialIdea={props.idea}
                onPreviewChange={setPreview}
                onBusyChange={setGenerating}
                onApply={(image) => {
                  props.onImageChange?.(image)
                  setMode('draw')
                }}
                fallback={<p role="status">{m.picture_diary_generation_loading()}</p>}
              />
            </Show>
          </Tabs.Content>
        </PModal>
      </Tabs>
    </>
  )
}
