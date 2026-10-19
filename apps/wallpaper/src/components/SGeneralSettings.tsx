import {version} from '../../package.json'
import icon from '../../src-tauri/icons/icon.png?url'

export const SGeneralSettings = () => (
  <section aria-label="일반" class="grid gap-6 pt-6">
    <div class="flex items-center gap-4">
      <img src={icon} alt="" class="h-12 w-12 rounded-xl" />
      <div>
        <h2 class="m-0 text-lg font-semibold">Wallpaper</h2>
        <p class="m-0 text-xs text-stone-600">버전 {version}</p>
      </div>
    </div>
    <dl class="m-0 grid text-sm">
      <div class="wallpaper-row">
        <dt>설정 저장</dt>
        <dd class="m-0 text-right text-stone-600">자동 저장</dd>
      </div>
      <div class="wallpaper-row">
        <dt>파일과 설정</dt>
        <dd class="m-0 text-right text-stone-600">현재 기기에 보관</dd>
      </div>
    </dl>
    <p class="m-0 text-xs leading-6 text-stone-600">설정 창을 닫아도 배경은 계속 실행됩니다.</p>
  </section>
)
