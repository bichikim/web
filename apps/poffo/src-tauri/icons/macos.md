# macOS 아이콘

[macos.icon](macos.icon)은 Icon Composer 원본이고, [macos.car](macos.car)는 앱에 포함하는 컴파일 결과다. 배경을 캔버스 끝까지 채우고 macOS가 모서리를 처리하도록 구성했다. 기존 `icon.icns`는 이전 macOS용으로 유지한다.

Tauri의 `.icon` 컴파일 단계에서 발생하는 [오류](https://github.com/tauri-apps/tauri/issues/15315)를 피하기 위해 미리 컴파일한 `.car`를 사용한다. 원본을 수정했다면 Xcode 26 이상이 설치된 Mac에서 저장소 루트를 기준으로 실행한다.

```sh
poffo_icon_output="$(mktemp -d)"
xcrun actool apps/poffo/src-tauri/icons/macos.icon \
  --compile "$poffo_icon_output" \
  --output-partial-info-plist "$poffo_icon_output/info.plist" \
  --app-icon macos --include-all-app-icons \
  --enable-on-demand-resources NO \
  --target-device mac --minimum-deployment-target 26.0 --platform macosx
cp "$poffo_icon_output/Assets.car" apps/poffo/src-tauri/icons/macos.car
```
