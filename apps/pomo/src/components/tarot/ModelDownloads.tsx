import * as m from '@paraglide/message'
import {Show} from 'solid-js'
import type {TarotReadingController, TarotSpeechController} from '../../features/tarot'
import {PModelDownloadConsent} from '../p-model-download-consent/PModelDownloadConsent'
import {DownloadStatus} from './DownloadStatus'

export interface ModelDownloadsProps {
  readonly part: 'consent' | 'progress'
  readonly reading: TarotReadingController
  readonly speech: TarotSpeechController
}

export const ModelDownloads = (props: ModelDownloadsProps) => {
  const textDownloading = () => props.reading.status() === 'downloading'
  const voiceDownloading = () => props.speech.status() === 'downloading'
  const textProgress = () => props.reading.progress()
  const voiceProgress = () => props.speech.progress()
  const showTextProgress = () =>
    textDownloading() && (textProgress() !== null || voiceProgress() === null)
  const showVoiceProgress = () => voiceDownloading() && !showTextProgress()
  const consentOwner = () => (props.reading.status() === 'consent' ? props.reading : props.speech)
  return (
    <>
      <Show when={props.part === 'progress' && (showTextProgress() || showVoiceProgress())}>
        <DownloadStatus
          onCancel={showTextProgress() ? props.reading.cancelDownload : props.speech.cancelDownload}
          progress={(showTextProgress() ? textProgress() : voiceProgress()) ?? 0}
          kind={showTextProgress() ? props.reading.downloadKind() : 'voice'}
        />
      </Show>
      <Show when={props.part === 'consent'}>
        <PModelDownloadConsent
          actionLabel={
            props.reading.status() === 'consent' ? m.tarot_download_action() : m.tarot_voice_play()
          }
          downloadSize={consentOwner().downloadSize()}
          isOpen={props.reading.status() === 'consent' || props.speech.status() === 'consent'}
          onCancel={consentOwner().cancelDownloadConsent}
          onConfirm={consentOwner().startDownload}
        />
      </Show>
    </>
  )
}
