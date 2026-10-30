import {usePlaybackFrame} from './use-playback-frame'
import {useWorkspace} from '../workspace/context'
import {RuntimeHeader} from './RuntimeHeader'
import {RuntimeWorkspace} from './RuntimeWorkspace'
import {RuntimeSplit} from './RuntimeSplit'
import {useRuntimeControls} from './use-runtime-controls'
import {RuntimeTools} from './RuntimeTools'
import {createSignal, Show, Suspense} from 'solid-js'
import {
  EditorButton,
  EditorColorField,
  EditorSelect,
  EditorStyles,
  EditorToast,
  FileLoadingDialog,
} from '@winter-love/puppet/editor'

import {useRuntimeDocument} from './use-runtime-document'
import {PlaybackCanvas} from './PlaybackCanvas'
import {ExpressionSelect} from './ExpressionSelect'

interface RuntimePageProps {
  readonly mode?: 'studio' | 'viewer'
}

export const RuntimePage = (props: RuntimePageProps) => {
  const sharedWorkspace = useWorkspace()
  const query = new URLSearchParams(location.search)
  const [error, setError] = createSignal<string | null>(null)
  const loading = useRuntimeDocument()
  const [motionId, setMotionId] = createSignal(query.get('motion') ?? undefined)
  const [playing, setPlaying] = createSignal(true)
  const [ready, setReady] = createSignal(false)
  const [background, setBackground] = createSignal('#111715')
  const {frame, resetFrame, resumeTime, updateFrame} = usePlaybackFrame(loading.document, () =>
    selectedMotion(),
  )
  const handleMotion = (id: string) => {
    setMotionId(id)
    setPlaying(true)
  }
  const controls = useRuntimeControls({document: loading.document, onMotion: handleMotion})
  const selectedMotion = () => {
    const motions = loading.document()?.motions ?? []
    const selected = motionId()
    return motions.some((motion) => motion.id === selected) ? selected : motions[0]?.id
  }
  const handleLoadModel = (file: File | undefined) => {
    if (file !== undefined) {
      loading.loadFile(file)
      setMotionId(undefined)
      resetFrame()
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
      motionId={selectedMotion()}
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
        <Show when={loading.document()} fallback={renderEmpty()}>
          {(current) => (
            <RuntimeWorkspace
              document={current()}
              controls={controls}
              studio={props.mode === 'studio'}
            >
              {(workspace) => (
                <>
                  <RuntimeHeader
                    studio={props.mode === 'studio'}
                    motionId={selectedMotion()}
                    onLoadModel={handleLoadModel}
                    workspace={workspace}
                  >
                    <EditorSelect
                      size="md"
                      label="모션 선택"
                      options={loading.document()?.motions.map((motion) => motion.id) ?? []}
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
                      expressions={current().expressions}
                      values={controls.modelExpressions()}
                      disabled={!ready()}
                      onChange={controls.selectModelExpressions}
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
                  <RuntimeSplit studio={props.mode === 'studio'} onResize={controls.retainCamera}>
                    <PlaybackCanvas
                      background={background()}
                      resumeTime={resumeTime()}
                      parameterValues={controls.values()}
                      view={controls.profile()?.view}
                      onViewChange={controls.updateView}
                      document={current()}
                      motionId={selectedMotion()}
                      expressionIds={controls.modelExpressions()}
                      playing={playing()}
                      onFrame={updateFrame}
                      onReady={setReady}
                      onError={setError}
                    />
                    <Show when={sharedWorkspace?.mode() !== 'editor'}>
                      <RuntimeTools
                        document={current()}
                        controls={controls}
                        workspace={workspace}
                        studio={props.mode === 'studio'}
                        onError={setError}
                      />
                    </Show>
                  </RuntimeSplit>
                </>
              )}
            </RuntimeWorkspace>
          )}
        </Show>
      </Suspense>
      <FileLoadingDialog fileName={loading.pendingFile()} onCancel={loading.cancel} />
      <Show when={message()}>
        {(message) => <EditorToast message={message()} onDismiss={handleDismiss} />}
      </Show>
    </main>
  )
}
