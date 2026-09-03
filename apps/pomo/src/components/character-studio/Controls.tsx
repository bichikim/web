import {cx} from 'class-variance-authority'

const INPUT_CLASSES = cx(
  'h-12 min-w-0 rounded-3 border border-white/10 bg-#0d1218 px-4 text-sm text-white outline-none',
  'placeholder:text-#64707a focus:border-#8bd8c0/55',
)

const BUTTON_CLASSES = cx(
  'h-12 rounded-3 bg-#a9e5d2 px-5 text-sm font-750 text-#10221d transition hover:bg-#c4f4e5',
  'disabled:cursor-not-allowed disabled:opacity-40',
)

const ASIDE_CLASSES = cx(
  'grid content-start gap-5 rounded-7 border border-white/10 bg-#171f28/88 p-5',
  'shadow-[0_1.5rem_5rem_rgba(0,0,0,0.24)] backdrop-blur-xl xs:p-6',
)

const FILE_PICKER_CLASSES = cx(
  'grid h-12 cursor-pointer place-items-center rounded-3 border border-dashed',
  'border-#8bd8c0/35 bg-#8bd8c0/5 text-sm text-#b8e8d8 transition hover:bg-#8bd8c0/10',
)

const RESET_BUTTON_CLASSES = cx(
  'h-11 rounded-3 border border-white/10 bg-transparent text-sm font-650 text-#aab5bd',
  'transition hover:bg-white/5 hover:text-white',
)

interface CharacterControlsProps {
  readonly modelName: string
  readonly onDefaultModelClick: () => void
  readonly onFileChange: (event: Event & {currentTarget: HTMLInputElement}) => void
  readonly onUrlInput: (event: InputEvent & {currentTarget: HTMLInputElement}) => void
  readonly onUrlSubmit: (event: SubmitEvent) => void
  readonly urlInput: string
}

export const CharacterControls = (props: CharacterControlsProps) => (
  <aside class={ASIDE_CLASSES}>
    <header>
      <p class="m-0 text-xs font-750 tracking-[0.22em] text-#8bd8c0 uppercase">3D character lab</p>
      <h1 class="mb-0 mt-3 text-2xl font-800 tracking--0.03em">Blender 캐릭터 연결</h1>
      <p class="mb-0 mt-3 text-sm leading-6 text-#9ba8b1">
        Babylon.js로 표준 GLB를 렌더링해요. Blender에서 내보낸 파일을 선택하면 즉시 교체됩니다.
      </p>
    </header>

    <div class="rounded-4 border border-#8bd8c0/14 bg-#8bd8c0/5 p-4">
      <p class="m-0 text-xs font-650 text-#89a49b">현재 모델</p>
      <p class="mb-0 mt-1 truncate text-sm font-700 text-#dff7ef">{props.modelName}</p>
    </div>

    <label class="grid gap-2 text-sm font-650 text-#d9e1e6">
      로컬 GLB 파일
      <span class={FILE_PICKER_CLASSES}>
        Blender GLB 선택
        <input
          accept=".glb,model/gltf-binary"
          class="sr-only"
          onChange={(event) => props.onFileChange(event)}
          type="file"
        />
      </span>
    </label>

    <form class="grid gap-2" onSubmit={(event) => props.onUrlSubmit(event)}>
      <label class="text-sm font-650 text-#d9e1e6" for="character-model-url">
        GLB URL
      </label>
      <input
        class={INPUT_CLASSES}
        id="character-model-url"
        onInput={(event) => props.onUrlInput(event)}
        placeholder="https://…/character.glb"
        type="url"
        value={props.urlInput}
      />
      <button class={BUTTON_CLASSES} disabled={props.urlInput.trim().length === 0} type="submit">
        URL 모델 불러오기
      </button>
    </form>

    <button class={RESET_BUTTON_CLASSES} onClick={() => props.onDefaultModelClick()} type="button">
      기본 캐릭터로 되돌리기
    </button>

    <div class="border-t border-white/8 pt-5">
      <h2 class="m-0 text-sm font-750 text-#d9e1e6">Blender 연결 순서</h2>
      <ol class="mb-0 mt-3 grid gap-2 pl-5 text-xs leading-5 text-#8f9ca5">
        <li>Blender에서 장면과 애니메이션 제작</li>
        <li>File → Export → glTF 2.0 선택</li>
        <li>장면을 표준 GLB로 내보내기</li>
        <li>위 파일/URL 입력으로 이 페이지에서 검증</li>
      </ol>
    </div>
  </aside>
)
