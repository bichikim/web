import {Show} from 'solid-js'

export const MicrophoneIcon = (props: {readonly recording: boolean}) => (
  <svg aria-hidden="true" height="24" viewBox="0 0 24 24" width="24">
    <Show
      fallback={
        <>
          <rect fill="currentColor" height="12" rx="4" width="8" x="8" y="2" />
          <path
            d="M5 11a7 7 0 0 0 14 0M12 18v4M8 22h8"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-width="2"
          />
        </>
      }
      when={props.recording}
    >
      <rect fill="currentColor" height="10" rx="2" width="10" x="7" y="7" />
    </Show>
  </svg>
)
