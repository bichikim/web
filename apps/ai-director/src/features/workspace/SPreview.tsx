import {Show} from 'solid-js'
import type {Preview} from './use-workspace'

export interface SPreviewProps {
  title?: string
  image?: Preview | null
}

export default function SPreview(props: SPreviewProps) {
  return (
    <figure class="m-0 overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
      <figcaption class="flex justify-between border-b border-slate-800 p-4 text-sm">
        <span>{props.title}</span>
        <span class="text-slate-400">
          {props.image?.width ?? '—'} × {props.image?.height ?? '—'}
        </span>
      </figcaption>
      <div class="flex h-[460px] items-center justify-center p-4">
        <Show
          when={props.image}
          fallback={<p class="text-center text-sm text-slate-400">이미지가 여기에 표시됩니다.</p>}
        >
          {(image) => (
            <img
              class="max-h-full max-w-full object-contain"
              src={image().url}
              alt={props.title ?? '이미지'}
            />
          )}
        </Show>
      </div>
    </figure>
  )
}
