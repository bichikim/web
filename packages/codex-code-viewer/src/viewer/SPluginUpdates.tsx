import {createEffect, Match, Show, Switch, untrack} from 'solid-js'
import manifest from '../../package.json'
import {usePluginUpdates} from './use-plugin-updates'
import {useTranslations} from './locale/use-translations'
import type {ViewerPort} from './types'

interface SPluginUpdatesProps {
  readonly active?: boolean
  readonly port: Pick<ViewerPort, 'call'>
}

export const SPluginUpdates = (props: SPluginUpdatesProps) => {
  const t = useTranslations()
  const updates = usePluginUpdates(untrack(() => props.port))
  createEffect(() => {
    if (props.active) {
      untrack(updates.check)
    }
  })
  const restart = () =>
    updates.release()?.target === 'claude'
      ? t('설치했습니다. Claude Desktop에서 새 로컬 세션을 열어 주세요.')
      : t('설치했습니다. Codex 앱을 완전히 종료하고 다시 열어 주세요.')
  const command = () => {
    const release = updates.release()
    const package_ = `@winter-love/codex-code-viewer@${release?.latest ?? 'latest'}`
    return `npx ${package_} install --target ${release?.target ?? 'codex'}`
  }
  return (
    <section aria-label={t('업데이트')} class="mt-6 space-y-2 border-t border-divider pt-4">
      <div class="flex flex-wrap items-baseline justify-between gap-2">
        <span class="text-sm font-medium">Code Viewer</span>
        <span class="text-xs text-muted">
          {t('현재 버전 {version}', {version: updates.release()?.current ?? manifest.version})}
        </span>
      </div>
      <div role="status" aria-live="polite" class="text-xs leading-5 text-muted">
        <Switch>
          <Match when={updates.pending() === 'check'}>{t('업데이트 확인 중…')}</Match>
          <Match when={updates.pending() === 'install'}>{t('업데이트 설치 중…')}</Match>
          <Match when={updates.failure() === 'check'}>
            {t('버전을 확인하지 못했습니다. 다시 시도해 주세요.')}
          </Match>
          <Match when={updates.failure() === 'busy'}>
            {t('다른 창에서 업데이트를 설치 중입니다. 완료 후 다시 확인해 주세요.')}
          </Match>
          <Match when={updates.failure() === 'install'}>
            <p class="m-0">{t('설치하지 못했습니다. 다시 시도하거나 터미널에서 실행해 주세요.')}</p>
            <code class="block break-all select-text font-mono">{command()}</code>
          </Match>
          <Match when={updates.release()?.status === 'installed'}>{restart()}</Match>
          <Match when={updates.release()?.status === 'available'}>
            {t('새 버전 {version}', {version: updates.release()?.latest ?? ''})}
          </Match>
          <Match when={updates.release()?.status === 'current'}>{t('최신 버전입니다.')}</Match>
        </Switch>
      </div>
      <Show when={updates.release()?.status !== 'installed'}>
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="ui-button"
            disabled={updates.pending() !== null}
            onClick={updates.check}
          >
            {t('업데이트 확인')}
          </button>
          <Show when={updates.release()?.status === 'available'}>
            <button
              type="button"
              class="ui-button"
              disabled={updates.pending() !== null}
              onClick={updates.install}
            >
              {t('업데이트하기')}
            </button>
          </Show>
        </div>
      </Show>
    </section>
  )
}
