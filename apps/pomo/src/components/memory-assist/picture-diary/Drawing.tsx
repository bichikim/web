import {Tabs} from '@kobalte/core/tabs'
import {clientOnly} from '@solidjs/start'
import {createSignal, Show} from 'solid-js'
import * as m from '@paraglide/message'
import type {PictureDiaryImage, PictureDiaryStroke} from '../../../features/picture-diary'
import {PButton} from '../../PButton'
import {PModal} from '../../PModal'
import {PModalTabList} from '../../PModalTabList'
import {PictureDiaryCanvas} from './Canvas'
import {useDrawingHistory} from './use-history'
import {DrawingActions} from './Actions'
import {DrawingTools} from './Tools'

const Generation = clientOnly(
  async () => {
    const {Generation} = await import('./Generation')
    return {default: Generation}
  },
  {lazy: true},
)

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
  const [color, setColor] = createSignal<NonNullable<PictureDiaryStroke['color']>>('ink')
  const [thickness, setThickness] =
    createSignal<NonNullable<PictureDiaryStroke['thickness']>>('medium')
  const [tool, setTool] = createSignal<'pen' | 'eraser'>('pen')
  const history = useDrawingHistory(props)
  const [preview, setPreview] = createSignal<PictureDiaryImage>()
  const [generating, setGenerating] = createSignal(false)
  const [generationVisited, setGenerationVisited] = createSignal(false)
  const [mode, setMode] = createSignal<'draw' | 'generate'>('draw')
  const [isOpen, setIsOpen] = createSignal(false)
  const [limitReached, setLimitReached] = createSignal(false)
  const [gestureRevision, setGestureRevision] = createSignal(0)
  const [trigger, setTrigger] = createSignal<HTMLButtonElement>()
  const changeHistory = (action: () => void) => {
    action()
    setGestureRevision((revision) => revision + 1)
    setLimitReached(false)
  }
  return (
    <>
      <button
        aria-label={m.picture_diary_edit_drawing()}
        aria-haspopup="dialog"
        class="picture-diary-drawing__trigger"
        disabled={props.disabled}
        onClick={() => {
          history.reset()
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
            <DrawingActions
              drawing={mode() === 'draw'}
              canUndo={history.canUndo()}
              canRedo={history.canRedo()}
              canClear={props.strokes.length > 0}
              onUndo={() => changeHistory(history.undo)}
              onRedo={() => changeHistory(history.redo)}
              onClear={() => changeHistory(history.clear)}
              doneDisabled={mode() === 'generate' && generating()}
              onDone={() => {
                const image = preview()
                if (mode() === 'generate' && image !== undefined) {
                  props.onImageChange?.(image)
                }
                setIsOpen(false)
              }}
            >
              <DrawingTools
                color={color()}
                thickness={thickness()}
                tool={tool()}
                onColor={setColor}
                onThickness={setThickness}
                onTool={setTool}
              />
            </DrawingActions>
          }
        >
          <Show when={props.image && props.onImageChange}>
            <div class="mb-3">
              <PButton
                bordered
                transparent
                size="small"
                tone="secondary"
                onPress={() => props.onImageChange?.(undefined)}
              >
                {m.picture_diary_remove_image()}
              </PButton>
            </div>
          </Show>
          <Tabs.Content value="draw" aria-label={m.picture_diary_draw()}>
            <div class="picture-diary-drawing__surface max-w-[max(6rem,calc((100dvh-22rem)*1000/562))]">
              <PictureDiaryCanvas
                image={props.image}
                strokes={props.strokes}
                color={color()}
                thickness={thickness()}
                tool={tool()}
                gestureRevision={gestureRevision()}
                onStart={history.begin}
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
