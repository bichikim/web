# 파일 트리 성능 측정

이 디렉터리의 도구는 성능 회귀를 수동으로 재현한다. 실행 위치는 `packages/codex-code-viewer`다.

## 브라우저

프로덕션 설정으로 측정 페이지를 빌드한다.

```sh
node --input-type=module <<'JS'
import {build} from 'vite'
await build({configFile: 'vite.config.ts', build: {
  outDir: '/tmp/code-viewer-tree-browser', emptyOutDir: true,
  rollupOptions: {input: 'benchmarks/file-tree/index.html'},
}})
JS
python3 -m http.server 57901 --bind 127.0.0.1 --directory /tmp/code-viewer-tree-browser
```

`http://127.0.0.1:57901/benchmarks/file-tree/index.html`에서 **Run render benchmark**를 누른다. 실제 `SFileTree`와 MCP 배치 소비 경로를 실행하며, 전송 경계만 즉시 응답하는 fixture로 대체한다. 최종 DOM 반영과 로딩 종료까지 측정한다. 첫 행 시간은 DOM 생성 시점이며, 배치 읽기 간격에는 렌더링 프레임 대기도 포함된다. 통신 지연·INP·스크롤 프레임 시간 측정은 아니다.

## 서버

```sh
node --import tsx benchmarks/file-tree/server.ts
```

실제 임시 파일을 생성해 펼쳐진 트리의 최초 조회, 버전이 같은 재조회, 한 폴더 변경, 반복 검색을 측정한다. 생성·삭제 시간은 결과에 포함하지 않는다. `bytes`는 목록 배치 JSON 크기이며 MCP 봉투·종료 메시지는 제외한다. fixture는 종료 시 삭제한다.

파일 감시나 로컬 포트가 제한된 환경에서는 해당 기능을 허용하는 실행 환경을 사용해야 한다. SSD·파일 시스템 캐시·브라우저·하드웨어에 따라 수치는 달라진다.
