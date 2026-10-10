interface SoundGenerationResultActionsProps {
  readonly checked: boolean
  readonly onRepeatChange: (enabled: boolean) => void
  readonly url: string
}

export function SoundGenerationResultActions(props: SoundGenerationResultActionsProps) {
  return (
    <>
      <label class="inline-flex min-h-11 items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={props.checked}
          onChange={(event) => props.onRepeatChange(event.currentTarget.checked)}
        />
        반복 재생
      </label>
      <a
        class="inline-flex min-h-11 items-center text-sm text-#b8e8d0 underline"
        download="environment.wav"
        href={props.url}
      >
        WAV 다운로드
      </a>
    </>
  )
}
