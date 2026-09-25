import {Show} from 'solid-js'

import type {AiTextJobController} from '../../features/ai-job/use-ai-text-job'

interface PAiJobStatusProps {
  readonly job: AiTextJobController
}

const isTerminalWithoutResult = (status: ReturnType<AiTextJobController['jobStatus']>) =>
  status === 'failed' || status === 'cancelled' || status === 'timed_out' || status === 'error'

// oxlint-disable-next-line eslint/max-lines-per-function -- The panel keeps job actions and result playback in one accessible status region.
export const PAiJobStatus = (props: PAiJobStatusProps) => {
  const hasVisibleStatus = () =>
    props.job.jobStatus() !== 'idle' ||
    props.job.accessMessage() !== null ||
    props.job.actionMessage() !== null
  const artifact = () => props.job.jobResult()?.artifact
  const artifactUrl = () => artifact()?.url
  const artifactContentType = () => artifact()?.contentType ?? ''

  return (
    <Show when={hasVisibleStatus()}>
      <section
        aria-live="polite"
        class="grid gap-2 rounded-lg border border-border bg-surface/70 p-3 text-sm text-foreground"
      >
        <Show when={props.job.accessMessage()}>
          {(message) => <p class="text-muted-foreground">{message()}</p>}
        </Show>
        <Show
          when={
            props.job.jobStatus() !== 'idle' &&
            !isTerminalWithoutResult(props.job.jobStatus()) &&
            props.job.statusMessage()
          }
        >
          {(message) => <p>{message()}</p>}
        </Show>
        <Show when={props.job.jobStatus() === 'running' && props.job.job()}>
          {(currentJob) => (
            <progress
              aria-label="AI 작업 진행률"
              class="h-1 w-full accent-highlight"
              max="100"
              value={currentJob().progress}
            />
          )}
        </Show>
        <div class="flex flex-wrap gap-2">
          <Show when={props.job.isBusy()}>
            <button
              class="rounded border border-border px-3 py-1.5 hover:bg-surface-interactive disabled:opacity-50"
              disabled={props.job.isCancelling()}
              onClick={() => {
                props.job.cancel().catch(() => undefined)
              }}
              type="button"
            >
              취소
            </button>
          </Show>
          <Show when={props.job.jobStatus() === 'recovery_pending'}>
            <button
              class="rounded border border-border px-3 py-1.5 hover:bg-surface-interactive"
              onClick={() => {
                props.job.retry().catch(() => undefined)
              }}
              type="button"
            >
              같은 요청 상태 다시 확인
            </button>
          </Show>
          <Show when={isTerminalWithoutResult(props.job.jobStatus())}>
            <button
              class="rounded border border-border px-3 py-1.5 hover:bg-surface-interactive"
              onClick={() => {
                props.job.retry().catch(() => undefined)
              }}
              type="button"
            >
              다시 시도
            </button>
          </Show>
          <Show
            when={
              props.job.jobStatus() === 'succeeded' && props.job.jobResult()?.text !== undefined
            }
          >
            <button
              class="rounded border border-border px-3 py-1.5 hover:bg-surface-interactive"
              onClick={() => {
                props.job.speakResult().catch(() => undefined)
              }}
              type="button"
            >
              결과 다시 읽기
            </button>
          </Show>
          <Show when={props.job.jobStatus() === 'succeeded' && artifact() !== undefined}>
            <button
              class="rounded border border-border px-3 py-1.5 hover:bg-surface-interactive disabled:opacity-50"
              disabled={props.job.isRefreshingResult()}
              onClick={() => {
                props.job.refreshResult().catch(() => undefined)
              }}
              type="button"
            >
              결과 다시 열기
            </button>
            <button
              class="rounded border border-border px-3 py-1.5 hover:bg-surface-interactive disabled:opacity-50"
              disabled={props.job.isSaving()}
              onClick={() => {
                props.job.saveArtifact().catch(() => undefined)
              }}
              type="button"
            >
              결과 저장
            </button>
            <button
              class="rounded border border-border px-3 py-1.5 hover:bg-surface-interactive disabled:opacity-50"
              disabled={props.job.isDeleting()}
              onClick={() => {
                props.job.deleteArtifact().catch(() => undefined)
              }}
              type="button"
            >
              결과 삭제
            </button>
          </Show>
          <Show
            when={
              props.job.jobStatus() === 'succeeded' &&
              !props.job.artifactDeleted() &&
              props.job.jobResult()?.text === undefined &&
              artifact() === undefined
            }
          >
            <button
              class="rounded border border-border px-3 py-1.5 hover:bg-surface-interactive disabled:opacity-50"
              disabled={props.job.isRefreshingResult()}
              onClick={() => {
                props.job.refreshResult().catch(() => undefined)
              }}
              type="button"
            >
              결과 조회
            </button>
          </Show>
        </div>
        <Show when={artifactUrl()}>
          {(url) => (
            <>
              <Show when={artifactContentType().startsWith('image/')}>
                <img alt="AI 생성 결과" class="max-h-72 max-w-full rounded" src={url()} />
              </Show>
              <Show when={artifactContentType().startsWith('audio/')}>
                <audio controls src={url()} />
              </Show>
              <p class="text-xs text-muted-foreground">
                접근 주소는 만료될 수 있어요. 다시 열 때 새 주소를 조회합니다. 저장하지 않은 결과는
                보관 기간이 지나면 삭제될 수 있어요.
              </p>
            </>
          )}
        </Show>
        <Show when={props.job.actionMessage()}>
          {(message) => <p class="text-xs text-muted-foreground">{message()}</p>}
        </Show>
      </section>
    </Show>
  )
}
