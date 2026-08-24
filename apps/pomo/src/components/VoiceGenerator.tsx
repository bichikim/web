import {cx} from 'class-variance-authority'
import {createSignal} from 'solid-js'

import {
  parseSupertonicVoiceStyle,
  SUPERTONIC_VOICES,
  type SupertonicModelId,
  useSupertonicVoiceLab,
} from '../features/supertonic'
import {AudioChunks} from './voice-generator/AudioChunks'
import {AudioResults} from './voice-generator/AudioResults'
import {ModelPicker} from './voice-generator/ModelPicker'
import {VoiceActions} from './voice-generator/Actions'
import {type ImportedVoice} from './VoiceDropZone'
import {VoiceFields} from './voice-generator/Fields'
import {VoiceHeader} from './voice-generator/Header'
const MAXIMUM_FILE_SIZE = 2_000_000
const INITIAL_TEXT = '오늘도 서두르지 말고, 한 번에 하나씩 집중해 볼까요?'
const SECTION_CLASSES = cx(
  'relative w-full max-w-3xl overflow-hidden rounded-8 border border-white/10',
  'bg-#211a2b/88 p-5 shadow-[0_28px_100px_rgba(5,2,10,0.45)] backdrop-blur-xl xs:p-8',
)

export const VoiceGenerator = () => {
  const voiceLab = useSupertonicVoiceLab({initialText: INITIAL_TEXT})
  const [importedVoice, setImportedVoice] = createSignal<ImportedVoice | null>(null)
  const [fileError, setFileError] = createSignal<string | null>(null)
  let fileSelectionId = 0

  const handleModelChange = (modelId: SupertonicModelId) => {
    voiceLab.selectModel(modelId)
  }

  const handleTextInput = (event: InputEvent & {currentTarget: HTMLTextAreaElement}) => {
    voiceLab.setText(event.currentTarget.value)
  }

  const handleVoiceChange = (event: Event & {currentTarget: HTMLSelectElement}) => {
    const voice = SUPERTONIC_VOICES.find((item) => item.id === event.currentTarget.value)

    if (voice !== undefined) {
      fileSelectionId += 1
      setImportedVoice(null)
      setFileError(null)
      voiceLab.selectVoice(voice.id)
    }
  }
  const handleFileSelect = async (file: File | undefined) => {
    fileSelectionId += 1
    const currentSelectionId = fileSelectionId
    setFileError(null)

    if (file === undefined) {
      return
    }

    if (!file.name.toLowerCase().endsWith('.json')) {
      setFileError('Supertonic 3 목소리 스타일 JSON 파일을 선택해 주세요.')
      return
    }

    if (file.size > MAXIMUM_FILE_SIZE) {
      setFileError('목소리 JSON은 2MB보다 작아야 해요.')
      return
    }

    try {
      const value: unknown = JSON.parse(await file.text())

      if (currentSelectionId !== fileSelectionId) {
        return
      }

      const voiceStyle = parseSupertonicVoiceStyle(value)

      if (!voiceStyle.ok) {
        setFileError('Supertonic 3 목소리 스타일 형식과 맞지 않는 JSON이에요.')
        return
      }

      setImportedVoice({name: file.name, size: file.size})
      voiceLab.selectCustomVoice(voiceStyle.value)
    } catch {
      if (currentSelectionId === fileSelectionId) {
        setFileError('JSON 파일을 읽지 못했어요. 파일이 손상되지 않았는지 확인해 주세요.')
      }
    }
  }
  return (
    <section class={SECTION_CLASSES}>
      <div class="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-#ed91aa/12 blur-3xl" />
      <VoiceHeader />

      <div class="relative mt-8 grid gap-6">
        <ModelPicker
          disabled={voiceLab.isBusy()}
          onModelChange={handleModelChange}
          selectedModelId={voiceLab.selectedModelId()}
        />

        <VoiceFields
          disabled={voiceLab.isBusy()}
          fileError={fileError()}
          importedVoice={importedVoice()}
          onFileSelect={handleFileSelect}
          onSampleSelect={voiceLab.setText}
          onTextInput={handleTextInput}
          onVoiceChange={handleVoiceChange}
          selectedVoiceId={voiceLab.selectedVoiceId()}
          text={voiceLab.text()}
        />

        <AudioChunks chunks={voiceLab.chunks()} />
        <AudioResults results={voiceLab.results()} />
        <VoiceActions
          canGenerate={voiceLab.canGenerate()}
          canPrepare={voiceLab.canPrepare()}
          errorMessage={voiceLab.errorMessage()}
          isModelReady={voiceLab.isModelReady()}
          onGenerate={voiceLab.generate}
          onPrepare={voiceLab.prepare}
          progress={voiceLab.progress()}
          status={voiceLab.state().status}
        />
      </div>
    </section>
  )
}
