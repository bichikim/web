import type {RuntimeView} from '../tracking/types'
import {RuntimeHeader} from './RuntimeHeader'
import {RuntimeWorkspace} from './RuntimeWorkspace'
import {RuntimeSplit} from './RuntimeSplit'
import {useRuntimeControls} from './use-runtime-controls'
import {RuntimeTools} from './RuntimeTools'
import {createSignal, Show, Suspense} from 'solid-js'
import {EditorButton, EditorColorField, EditorSelect, EditorToast} from '../design-system'
import {EditorStyles} from '../editor/internal/EditorStyles'
import {type PlayerFrame, type PuppetDocument} from '../player'
import {useRuntimeDocument} from './use-runtime-document'
import {PlaybackCanvas} from './PlaybackCanvas'
import {ExpressionSelect} from './ExpressionSelect'

interface RuntimePageProps {
  readonly mode?: 'studio' | 'viewer'
  readonly loadInitialDocument: () => Promise<PuppetDocument>
}

export const RuntimePage = (props: RuntimePageProps) => {
  const query = new URLSearchParams(location.search)
  const [error, setError] = createSignal<string | null>(null)
  const loading = useRuntimeDocument({
    loadInitialDocument: () => props.loadInitialDocument(),
    sessionId: query.get('session'),
  })
  const {document} = loading
  const [motionId, setMotionId] = createSignal(query.get('motion') ?? undefined)
  const [playing, setPlaying] = createSignal(true)
  const [ready, setReady] = createSignal(false)
  const [background, setBackground] = createSignal('#111715')
  const [frame, setFrame] = createSignal<PlayerFrame | null>(null)
  const handleMotion = (id: string) => {
    setMotionId(id)
    setPlaying(true)
  }
  const controls = useRuntimeControls({document, onMotion: handleMotion})
  const handleViewChange = (view: RuntimeView) => {
    const profile = controls.profile()
    const previous = profile?.view
    if (
      profile !== undefined &&
      (previous === undefined ||
        previous.fitted !== view.fitted ||
        previous.camera.x !== view.camera.x ||
        previous.camera.y !== view.camera.y ||
        previous.camera.zoom !== view.camera.zoom)
    ) {
      controls.updateProfile({...profile, view})
    }
  }
  const selectedMotion = () => {
    const motions = document()?.motions ?? []
    const selected = motionId()
    return motions.some((motion) => motion.id === selected) ? selected : motions[0]?.id
  }
  const handleLoadModel = (file: File | undefined) => {
    if (file !== undefined) {
      loading.loadFile(file)
      setMotionId(undefined)
      setFrame(null)
      setPlaying(true)
    }
  }
  const message = () => error() ?? loading.error() ?? controls.error()
  const handleDismiss = () => {
    setError(null)
    loading.dismissError()
    controls.dismissError()
  }
  const renderEmpty = () => (
    <RuntimeHeader
      studio={props.mode === 'studio'}
      onLoadModel={handleLoadModel}
      loading={!loading.error()}
    />
  )
  return (
    <main
      class="puppet-editor editor-type-root puppet-viewer-page"
      style={{'--viewer-background': background()}}
    >
      <EditorStyles />
      <Suspense fallback={renderEmpty()}>
        <Show when={document()} keyed fallback={renderEmpty()}>
          {(current) => (
            <RuntimeWorkspace
              document={current}
              controls={controls}
              studio={props.mode === 'studio'}
            >
              {(workspace) => (
                <>
                  <RuntimeHeader
                    studio={props.mode === 'studio'}
                    onLoadModel={handleLoadModel}
                    workspace={workspace}
                  >
                    <EditorSelect
                      size="md"
                      label="모션 선택"
                      options={document()?.motions.map((motion) => motion.id) ?? []}
                      value={selectedMotion()}
                      disabled={!ready() || selectedMotion() === undefined}
                      onChange={setMotionId}
                    />
                    <EditorButton
                      size="md"
                      disabled={!ready() || selectedMotion() === undefined}
                      aria-pressed={playing()}
                      onClick={() => setPlaying((value) => !value)}
                    >
                      {playing() ? '일시정지' : '재생'}
                    </EditorButton>
                    <ExpressionSelect
                      expressions={current.expressions}
                      value={controls.modelExpression()}
                      disabled={!ready()}
                      onChange={controls.selectModelExpression}
                    />
                    <div class="puppet-viewer-background">
                      <EditorColorField
                        size="md"
                        label="배경색"
                        value={background()}
                        onValueChange={setBackground}
                      />
                    </div>
                    <Show when={frame()}>
                      {(current) => (
                        <output class="puppet-viewer-time" aria-label="재생 시간">
                          {current().time.toFixed(2)} / {current().duration.toFixed(2)}s
                        </output>
                      )}
                    </Show>
                  </RuntimeHeader>
                  <RuntimeSplit studio={props.mode === 'studio'}>
                    <PlaybackCanvas
                      parameterValues={controls.values()}
                      view={controls.profile()?.view}
                      onViewChange={handleViewChange}
                      document={current}
                      motionId={selectedMotion()}
                      expressionId={controls.modelExpression()}
                      playing={playing()}
                      onFrame={setFrame}
                      onReady={setReady}
                      onError={setError}
                    />
                    <RuntimeTools
                      document={current}
                      controls={controls}
                      workspace={workspace}
                      studio={props.mode === 'studio'}
                      onError={setError}
                    />
                  </RuntimeSplit>
                </>
              )}
            </RuntimeWorkspace>
          )}
        </Show>
      </Suspense>
      <Show when={message()}>
        {(message) => <EditorToast message={message()} onDismiss={handleDismiss} />}
      </Show>
    </main>
  )
}
