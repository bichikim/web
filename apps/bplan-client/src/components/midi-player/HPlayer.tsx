import {SPlayerButton} from './SPlayerButton'
import {SFileList} from './SFileList'
import {cx} from 'class-variance-authority'

export const HPlayer = () => {
  const list = [
    {ext: 'wav', generated: true, id: '1', name: 'Awesome my wave'},
    {ext: 'mp3', id: '2', inProgress: true, name: 'What the human says'},
    {ext: 'midi', id: '3', name: 'Drop the beat'},
    {ext: 'mp3', id: '4', name: 'foo'},
    {id: '5', name: 'foo'},
    {id: '6', name: 'foo'},
    {id: '7', name: 'foo'},
  ]
  return (
    <div class="min-w-400px bg-white p-2 rd-2 flex flex-col gap-4 relative">
      <SFileList list={list} class="max-h-102px" />
      <div class="flex gap-2 p-2">
        <SPlayerButton class="min-w-44px bg-gray-100">
          <span class="block i-hugeicons:play text-32px" />
        </SPlayerButton>

        <SPlayerButton class="min-w-44px bg-gray-100">
          <span class="block i-hugeicons:pause text-32px" />
        </SPlayerButton>
        <div
          class={cx(
            'min-w-44px bg-gray-100 flex items-center justify-center flex-grow-1 rd-6px cursor-pointer',
            'b-dashed b-2px b-gray',
          )}
        >
          <span class="">Click or Drop </span>
          <span class="block i-hugeicons:file-add text-28px px-1" />
          <span>Your files</span>
        </div>
      </div>
      <div
        class={cx(
          'absolute top--20px left--20px w-36px h-36px flex items-center justify-center rd-6px',
          'bg-red cursor-pointer',
        )}
      >
        <span class="inline-block i-hugeicons:cancel-02 text-28px text-white" />
      </div>
      {/*<SPlayerButton>*/}
      {/*  <span class="block i-hugeicons:volume-minus" />*/}
      {/*</SPlayerButton>*/}

      {/*<span class="block i-hugeicons:volume-up" />*/}
      {/*<span class="block i-hugeicons:volume-high" />*/}
      {/*<span class="block i-hugeicons:volume-low" />*/}
      {/*<span class="block i-hugeicons:volume-mute-01" />*/}
      {/*<span class="black i-hugeicons:file-add" />*/}
      {/*<span class="black i-hugeicons:file-remove" />*/}
      {/*<span class="black i-hugeicons:file-download" />*/}
    </div>
  )
}
