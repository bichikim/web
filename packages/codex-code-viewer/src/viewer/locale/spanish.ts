import type {MessageCatalog} from './types'

export const spanish = {
  ' (이미지)': ' (Imagen)',
  ' (이미지를 표시할 수 없습니다)': ' (Imagen no disponible)',
  '{count}개': '{count}',
  '{count}줄': '{count} líneas',
  '{count}픽셀': '{count} píxeles',
  '{count}행': '{count} filas',
  '{line}줄 선택': 'Seleccionar línea {line}',
  '{line}줄 접기': 'Plegar línea {line}',
  '{line}줄 펼치기': 'Desplegar línea {line}',
  '{name} 정렬': 'Ordenar por {name}',
  '{path} · 복사했습니다. 대상 폴더에 붙여넣으세요.':
    '{path} · Copiado. Pégalo en la carpeta de destino.',
  '{path} · 붙여넣었습니다.': '{path} · Pegado.',
  '{path} · 삭제했습니다.': '{path} · Eliminado.',
  '{path} · 아직 지원하지 않는 파일 형식': '{path} · Formato de archivo no compatible',
  '{path} · 이름을 변경했습니다.': '{path} · Nombre cambiado.',
  '{path} · 잘라냈습니다. 대상 폴더에 붙여넣으세요.':
    '{path} · Cortado. Pégalo en la carpeta de destino.',
  '{path} {page}페이지': '{path}, página {page}',
  '{title} {count}개': '{title}: {count}',
  '{title} 검색 중': 'Buscando {title}',
  '1줄': '1 línea',
  '32 MiB 이하 SVG에서 원문을 볼 수 있습니다.':
    'El código fuente está disponible para archivos SVG de hasta 32 MiB.',
  '32 MiB보다 큰 텍스트 파일은 이 뷰어에서 열 수 없습니다.':
    'Este visor no puede abrir archivos de texto de más de 32 MiB.',
  '128 MiB보다 큰 문서·이미지·영상·음악은 이 뷰어에서 열 수 없습니다.':
    'Este visor no puede abrir documentos ni archivos multimedia de más de 128 MiB.',
  '512 KiB 이하 SVG에서 원문을 볼 수 있습니다.':
    'El código fuente está disponible para archivos SVG de hasta 512 KiB.',
  '512 KiB보다 큰 파일은 이 뷰어에서 열 수 없습니다.':
    'Este visor no puede abrir archivos de código de más de 512 KiB.',
  '512 KiB보다 큰 파일은 읽기 전용입니다.': 'Los archivos de más de 512 KiB son de solo lectura.',
  '512 KiB보다 큰 파일은 편집할 수 없습니다.': 'No se pueden editar archivos de más de 512 KiB.',
  'Claude 입력창에서 Cmd+V로 붙여넣으세요.':
    'Pulsa Cmd+V en el cuadro de mensaje de Claude para adjuntar.',
  'Claude 첨부로 복사': 'Copiar para adjuntar en Claude',
  'Claude에 첨부': 'Adjuntar a Claude',
  'Code Viewer 연결을 확인해 주세요.': 'Comprueba la conexión de Code Viewer.',
  'Codex가 파일 경로를 전달하지 않았습니다. code.open 도구로 파일을 열어 주세요.':
    'Codex no ha proporcionado una ruta. Abre el archivo con code.open.',
  'DOCX 미리보기': 'Vista previa de DOCX',
  'DOCX 파일을 읽을 수 없습니다. 손상되었거나 암호화된 파일인지 확인해 주세요.':
    'No se puede leer este archivo DOCX. Comprueba si está dañado o cifrado.',
  'Markdown 미리보기': 'Vista previa de Markdown',
  'MCP 연결이 필요합니다.': 'Se requiere una conexión MCP.',
  'MDX 코드는 실행하지 않습니다.': 'El código MDX no se ejecuta.',
  'PDF 배율 (%)': 'Zoom del PDF (%)',
  'PDF 배율 조절': 'Controles de zoom del PDF',
  'PDF 불러오는 중…': 'Cargando PDF…',
  'PDF 축소': 'Reducir PDF',
  'PDF 텍스트': 'Texto del PDF',
  'PDF 텍스트 검색': 'Buscar texto en el PDF',
  'PDF 텍스트 읽는 중…': 'Leyendo texto del PDF…',
  'PDF 텍스트를 읽을 수 없습니다. 검색을 다시 열어 재시도해 주세요.':
    'No se puede leer el texto del PDF. Vuelve a abrir la búsqueda para reintentarlo.',
  'PDF 텍스트를 읽을 수 없어 선택할 수 없습니다.':
    'No se puede seleccionar texto porque no se ha podido leer el PDF.',
  'PDF 페이지': 'Página del PDF',
  'PDF 페이지 보기': 'Vista de página del PDF',
  'PDF 페이지 조절': 'Navegación de páginas del PDF',
  'PDF 표시 방식': 'Vista del PDF',
  'PDF 확대': 'Ampliar PDF',
  'PDF를 표시할 수 없습니다. 파일이 손상되었거나 암호가 필요한지 확인해 주세요.':
    'No se puede mostrar este PDF. Comprueba si está dañado o protegido con contraseña.',
  'Ruby 분석기를 실행할 수 없습니다. 프로젝트에 맞는 Ruby 환경에서 gem install solargraph를 실행한 뒤 뷰어를 다시 열어 주세요.':
    'El analizador de Ruby no está disponible. Ejecuta gem install solargraph en el entorno Ruby ' +
    'del proyecto y vuelve a abrir el visor.',
  'Ruby 정의를 분석하지 못했습니다. Ruby 버전과 프로젝트의 gem 설정을 확인하고 뷰어를 다시 열어 주세요.':
    'No se han podido analizar las definiciones de Ruby. Comprueba la versión de Ruby y la ' +
    'configuración de gem, y vuelve a abrir el visor.',
  'Rust 정의를 분석하지 못했습니다. Cargo 프로젝트 설정을 확인하고 뷰어를 다시 열어 주세요.':
    'No se han podido analizar las definiciones de Rust. Comprueba la configuración del proyecto ' +
    'Cargo y vuelve a abrir el visor.',
  'XLSX 파일을 읽을 수 없습니다. 파일 형식을 확인해 주세요.':
    'No se puede leer este archivo XLSX. Comprueba el formato.',
  '같은 이름의 파일이나 폴더가 이미 있습니다. 다른 이름을 입력해 주세요.':
    'Ya existe un archivo o carpeta con este nombre. Elige otro nombre.',
  검색: 'Buscar',
  '검색 결과는 처음 {count}개까지 표시합니다.': 'Se muestran los primeros {count} resultados.',
  '검색 상한에 도달해 문서 앞부분만 검색합니다.':
    'Se ha alcanzado el límite de búsqueda. Solo se busca en el principio del documento.',
  '검색이 중단됐습니다. 찾은 {title}는 계속 확인할 수 있습니다.':
    'La búsqueda se ha detenido. Los resultados de {title} encontrados siguen visibles.',
  '결과 없음': 'Sin resultados',
  '경로 복사': 'Copiar ruta',
  '경로를 복사했습니다.': 'Ruta copiada.',
  '계속 편집': 'Seguir editando',
  '내용이나 선택이 변경됐습니다. 다시 선택해 주세요.':
    'El contenido o la selección ha cambiado. Selecciona de nuevo.',
  '내장 Rust 분석기를 실행할 수 없습니다. 플러그인 설치 상태를 확인하고 뷰어를 다시 열어 주세요.':
    'No se ha podido iniciar el analizador de Rust incluido. Comprueba la instalación del ' +
    'complemento y vuelve a abrir el visor.',
  '다른 곳에서 파일이 변경되어 저장하지 않았습니다. 초안을 복사하거나 변경을 버린 뒤 원본을 다시 확인해 주세요.':
    'El archivo se ha modificado externamente y no se ha guardado. Copia el borrador o descarta ' +
    'los cambios y revisa el original.',
  '다른 창에서 업데이트를 설치 중입니다. 완료 후 다시 확인해 주세요.':
    'Otra ventana está instalando una actualización. Compruébalo de nuevo cuando termine.',
  '다음 PDF 페이지': 'Página siguiente del PDF',
  '다음 검색 결과': 'Resultado de búsqueda siguiente',
  '다음 결과 (Enter)': 'Resultado siguiente (Enter)',
  '다음 표 페이지': 'Página siguiente de la tabla',
  닫기: 'Cerrar',
  '닫기 (Escape)': 'Cerrar (Escape)',
  '뒤로 이동': 'Atrás',
  '만드는 중…': 'Creando…',
  만들기: 'Crear',
  '만들지 못했습니다. 대상 폴더와 파일 권한을 확인해 주세요.':
    'No se ha podido crear el elemento. Comprueba la carpeta de destino y los permisos.',
  '모두 저장': 'Guardar todo',
  '문서 도구': 'Herramientas del documento',
  '문서 변환 안내 (': 'Notas de conversión del documento (',
  '문서 이미지': 'Imagen del documento',
  '문서 표시 방식': 'Vista del documento',
  '문서 해석 중…': 'Leyendo documento…',
  '문서를 불러오지 못했습니다.': 'No se ha podido cargar el documento.',
  '미디어 데이터를 읽지 못했습니다.': 'No se han podido leer los datos multimedia.',
  '미디어 불러오는 중…': 'Cargando contenido multimedia…',
  '미디어 파일이 아닙니다.': 'Este no es un archivo multimedia.',
  '미디어를 읽지 못했습니다.': 'No se ha podido leer el archivo multimedia.',
  미리보기: 'Vista previa',
  '미리보기 줄 수': 'Líneas de vista previa',
  '미저장 변경으로 종료를 취소했습니다.':
    'Se ha cancelado el cierre porque hay cambios sin guardar.',
  '미저장 변경을 먼저 저장하거나 버린 뒤 파일 작업을 해 주세요.':
    'Guarda o descarta los cambios antes de realizar operaciones con archivos.',
  '미저장 변경이 있습니다': 'Cambios sin guardar',
  '버전을 확인하지 못했습니다. 다시 시도해 주세요.':
    'No se han podido comprobar las actualizaciones. Inténtalo de nuevo.',
  변경: 'Renombrar',
  '변경 내용 채팅에 추가': 'Añadir cambios al chat',
  '변경 내용을 다음 채팅 메시지에 추가했습니다.':
    'Se han añadido los cambios al próximo mensaje del chat.',
  '변경 버리기': 'Descartar cambios',
  '변경 범위가 커서 채팅에 추가하지 못했습니다. 변경 내용을 나누어 추가하세요.':
    'Los cambios son demasiado grandes para añadirlos al chat. Añádelos en partes más pequeñas.',
  '변경 중…': 'Renombrando…',
  '보호된 경로나 심볼릭 링크가 포함되어 이 작업을 수행할 수 없습니다.':
    'No se puede realizar esta operación en rutas protegidas ni enlaces simbólicos.',
  복사: 'Copiar',
  붙여넣기: 'Pegar',
  '붙여넣는 중…': 'Pegando…',
  사용처: 'Referencias',
  삭제: 'Eliminar',
  '삭제 중…': 'Eliminando…',
  '새 버전 {version}': 'Nueva versión {version}',
  '새 파일': 'Nuevo archivo',
  '새 폴더': 'Nueva carpeta',
  새로고침: 'Actualizar',
  '선택 항목 없음': 'Sin opciones',
  '선택한 코드를 다음 채팅 메시지에 추가했습니다.':
    'Se ha añadido el código seleccionado al próximo mensaje del chat.',
  '선택한 파일과 줄 정보를 다음 채팅 메시지에 추가했습니다.':
    'Se han añadido el archivo y las líneas seleccionadas al próximo mensaje del chat.',
  설정: 'Configuración',
  '설정 닫기': 'Cerrar configuración',
  '설치하지 못했습니다. 다시 시도하거나 터미널에서 실행해 주세요.':
    'La instalación ha fallado. Reinténtalo o ejecútala en un terminal.',
  '설치했습니다. Claude Desktop에서 새 로컬 세션을 열어 주세요.':
    'Instalado. Abre una nueva sesión local en Claude Desktop.',
  '설치했습니다. Codex 앱을 완전히 종료하고 다시 열어 주세요.':
    'Instalado. Cierra Codex por completo y vuelve a abrirlo.',
  '셀 내용을 표시합니다. 수식은 다시 계산하지 않습니다.':
    'Se muestran los valores de las celdas. Las fórmulas no se recalculan.',
  '소스 코드': 'Código fuente',
  '스트림에 연결할 수 없습니다.': 'No se puede conectar al flujo de datos.',
  시트: 'Hoja',
  '시트 선택': 'Elegir hoja',
  '시트는 처음 10,000행·100열까지 표시합니다.':
    'Se muestran las primeras 10.000 filas y 100 columnas de cada hoja.',
  알림: 'Notificación',
  '알림 닫기': 'Descartar notificación',
  '앞으로 이동': 'Adelante',
  언어: 'Idioma',
  업데이트: 'Actualizaciones',
  '업데이트 설치 중…': 'Instalando actualización…',
  '업데이트 확인': 'Buscar actualizaciones',
  '업데이트 확인 중…': 'Buscando actualizaciones…',
  업데이트하기: 'Actualizar',
  '엑셀 파일을 읽을 수 없습니다. 손상되었거나 암호화된 파일인지 확인해 주세요.':
    'No se puede leer esta hoja de cálculo. Comprueba si está dañada o cifrada.',
  '연결된 작업 폴더가 없습니다. 위에 파일의 절대 경로를 입력해 주세요.':
    'No hay un espacio de trabajo conectado. Introduce arriba la ruta absoluta de un archivo.',
  '연결이 종료되었습니다. 파일을 다시 열어 주세요.':
    'La conexión se ha cerrado. Vuelve a abrir el archivo.',
  '열 {count}': 'Columna {count}',
  원문: 'Fuente',
  '위치 확인': 'Resolver ubicación',
  '위치 확인 중': 'Resolviendo ubicación',
  '위치:': 'Ubicación:',
  '이 PDF에는 검색 가능한 텍스트가 없습니다.': 'Este PDF no contiene texto que se pueda buscar.',
  '이 뷰어가 열린 Claude Code 세션을 화면에 표시해 주세요.':
    'Muestra la sesión de Claude Code que contiene este visor.',
  '이 위치에 붙여넣을 수 없습니다. 다른 폴더를 선택해 주세요.':
    'No se puede pegar aquí. Elige otra carpeta.',
  '이 위치에서는 이동할 대상을 찾을 수 없습니다.':
    'No hay ningún destino de navegación en esta posición.',
  '이 채팅의 코드뷰어에만 기억합니다.': 'Solo se recuerda para Code Viewer en este chat.',
  '이 파일을': 'Este archivo',
  '이 파일을 표시할 수 없습니다. 파일 형식과 브라우저가 지원하는 코덱을 확인해 주세요.':
    'No se puede mostrar este archivo. Comprueba el formato y los códecs que admite el navegador.',
  '이동 대상이 없습니다. 작업 폴더 밖의 정의는 표시하지 않습니다.':
    'No hay ningún destino de navegación. No se muestran las definiciones fuera del espacio de trabajo.',
  '이동할 정의를 선택하세요.': 'Elige una definición a la que ir.',
  이름: 'Nombre',
  '이름 변경': 'Renombrar',
  '이미지 배율 (%)': 'Zoom de la imagen (%)',
  '이미지 축소': 'Reducir imagen',
  '이미지 표시 방식': 'Vista de imagen',
  '이미지 확대': 'Ampliar imagen',
  '이미지 확대 및 이동': 'Zoom y desplazamiento de imagen',
  '이전 PDF 페이지': 'Página anterior del PDF',
  '이전 검색 결과': 'Resultado de búsqueda anterior',
  '이전 결과 (Shift+Enter)': 'Resultado anterior (Shift+Enter)',
  '이전 표 페이지': 'Página anterior de la tabla',
  '일부 결과를 읽지 못했습니다. 다시 조회해 주세요.':
    'No se han podido leer algunos resultados. Vuelve a buscar.',
  '일부 폴더를 읽지 못해 검색 결과가 불완전합니다.':
    'Los resultados de búsqueda están incompletos porque no se han podido leer algunas carpetas.',
  '일부 폴더를 읽지 못했습니다. 새로고침하여 다시 탐색해 주세요.':
    'No se han podido leer algunas carpetas. Actualiza para reintentarlo.',
  '일치하는 파일이 없습니다.': 'No hay archivos coincidentes.',
  '읽기 전용': 'Solo lectura',
  자동: 'Automático',
  '자동 첨부를 위해 macOS 손쉬운 사용 권한을 허용해 주세요.':
    'Permite el acceso de Accesibilidad de macOS para adjuntar automáticamente.',
  '자동은 앱 언어를 따릅니다. 지원하지 않는 언어는 영어로 표시합니다.':
    'El modo automático sigue el idioma de la aplicación. Los idiomas no compatibles se muestran en inglés.',
  작업: 'Acciones',
  '작업 폴더': 'Espacio de trabajo',
  '작업 폴더 밖의 파일은 열 수 없습니다.':
    'No se pueden abrir archivos fuera del espacio de trabajo.',
  '작업 폴더 안에서 {title}를 찾지 못했습니다.':
    'No se ha encontrado {title} en el espacio de trabajo.',
  '작업 폴더를 기억하지 못했습니다. Codex 설정 폴더의 쓰기 권한을 확인해 주세요.':
    'No se ha podido recordar el espacio de trabajo. Comprueba los permisos de escritura de la ' +
    'carpeta de configuración de Codex.',
  '작업 폴더를 바꾸거나 닫기 전에 변경을 저장하세요.':
    'Guarda los cambios antes de cambiar o cerrar el espacio de trabajo.',
  잘라내기: 'Cortar',
  저장: 'Guardar',
  '저장 중…': 'Guardando…',
  '저장했습니다.': 'Guardado.',
  적용: 'Aplicar',
  '적용 중…': 'Aplicando…',
  접기: 'Plegar',
  '접힌 {count}줄 펼치기': 'Mostrar {count} líneas plegadas',
  '정의 선택': 'Elegir definición',
  '정의 위치': 'Definiciones',
  '정의·사용처 찾기': 'Buscar definiciones y referencias',
  제거: 'Quitar',
  '조회 연결이 끊겼습니다. 다시 조회해 주세요.':
    'La conexión de búsqueda se ha cerrado. Vuelve a buscar.',
  '존재하는 작업 폴더의 절대 경로를 입력해 주세요.':
    'Introduce la ruta absoluta de una carpeta existente.',
  '지원하지 않는 파일 형식입니다.': 'Formato de archivo no compatible.',
  '채팅 첨부 {count}개': 'Archivos adjuntos del chat: {count}',
  '채팅 첨부는 20개, 전체 64 KiB까지 추가할 수 있습니다.':
    'Los archivos adjuntos del chat están limitados a 20 elementos y 64 KiB en total.',
  '채팅을 확인할 수 없어 작업 폴더를 기억할 수 없습니다. 채팅에서 뷰어를 다시 열어 주세요.':
    'No se puede identificar este chat. Vuelve a abrir el visor desde el chat para recordar el espacio de trabajo.',
  '채팅창에 추가': 'Añadir al chat',
  '첨부 내용이 64 KiB를 넘습니다. 범위를 줄여서 추가해 주세요.':
    'El archivo adjunto supera los 64 KiB. Selecciona un rango más pequeño.',
  '첨부 비우기': 'Vaciar archivos adjuntos',
  '첨부 카드를 확인하지 못했습니다. Claude 입력창을 확인해 주세요.':
    'No se ha podido confirmar la tarjeta del archivo adjunto. Comprueba el cuadro de mensaje de Claude.',
  '첨부할 내용 {count}개': 'Contexto pendiente: {count}',
  '첫 행을 열 이름으로': 'Usar la primera fila como encabezados',
  '최신 버전입니다.': 'Ya tienes la última versión.',
  취소: 'Cancelar',
  '코드 복사': 'Copiar código',
  '코드 작업': 'Acciones de código',
  '코드 편집': 'Edición de código',
  '코드 편집 작업': 'Acciones de edición de código',
  '코드 편집기': 'Editor de código',
  '코드를 복사했습니다.': 'Código copiado.',
  '클립보드에 접근하지 못했습니다.': 'No se ha podido acceder al portapapeles.',
  '파이썬 분석기를 실행할 수 없습니다. 플러그인 설치 상태를 확인하고 뷰어를 다시 열어 주세요.':
    'No se ha podido iniciar el analizador de Python. Comprueba la instalación del complemento y ' +
    'vuelve a abrir el visor.',
  '파이썬 정의를 분석하지 못했습니다. 프로젝트 설정을 확인하고 뷰어를 다시 열어 주세요.':
    'No se han podido analizar las definiciones de Python. Comprueba la configuración del ' +
    'proyecto y vuelve a abrir el visor.',
  '파일 검색 결과': 'Resultados de búsqueda de archivos',
  '파일 경로 또는 검색어': 'Ruta de archivo o búsqueda',
  '파일 경로 또는 검색어…': 'Ruta de archivo o búsqueda…',
  '파일 내 검색': 'Buscar en el archivo',
  '파일 내 검색 닫기': 'Cerrar búsqueda en el archivo',
  '파일 내 검색어': 'Texto de búsqueda en el archivo',
  '파일 내용': 'Contenido del archivo',
  '파일 데이터': 'Datos del archivo',
  '파일 목록을 불러오는 중…': 'Cargando archivos…',
  '파일 삭제': 'Eliminar archivo',
  '파일 삭제 상태': 'Estado de eliminación del archivo',
  '파일 열기': 'Abrir archivo',
  '파일 작업을 완료하지 못했습니다. 목록을 확인하고 파일 권한과 남은 공간을 확인해 주세요.':
    'No se ha podido completar la operación. Comprueba la lista de archivos, los permisos y el espacio disponible.',
  '파일 작업이 끝나면 자동으로 닫힙니다.': 'Se cierra automáticamente al terminar la operación.',
  '파일 탐색': 'Navegación de archivos',
  '파일 트리': 'Árbol de archivos',
  '파일 트리 너비 조절': 'Cambiar el ancho del árbol de archivos',
  '파일 트리 새로고침': 'Actualizar árbol de archivos',
  '파일 트리 열기/닫기': 'Mostrar u ocultar el árbol de archivos',
  '파일 트리 작업': 'Acciones del árbol de archivos',
  '파일 트리에서 파일을 선택하거나 위에서 파일을 검색하세요.':
    'Elige un archivo del árbol o busca uno arriba.',
  '파일 필터링': 'Filtrar archivos',
  '파일 필터링…': 'Filtrar archivos…',
  '파일과 폴더가 10,000개를 넘는 항목은 한 번에 처리할 수 없습니다.':
    'No se pueden procesar más de 10.000 archivos y carpetas en una sola operación.',
  '파일로 이동': 'Ir al archivo',
  '파일을 다음 채팅 메시지에 추가했습니다.':
    'Se ha añadido el archivo al próximo mensaje del chat.',
  '파일을 먼저 열어 주세요.': 'Abre un archivo primero.',
  '파일을 열어 시작하세요': 'Abre un archivo para empezar',
  '파일을 읽지 못했습니다. 연결과 파일 권한을 확인해 주세요.':
    'No se ha podido leer el archivo. Comprueba la conexión y los permisos.',
  '파일을 저장하지 못했습니다. 파일 권한과 남은 공간을 확인해 주세요. 초안은 유지됩니다.':
    'No se ha podido guardar el archivo. Comprueba los permisos y el espacio disponible. El borrador se conserva.',
  '파일을 찾는 중…': 'Buscando archivos…',
  '파일을 찾을 수 없습니다.': 'Archivo no encontrado.',
  '파일의 절대 경로 입력…': 'Introduce la ruta absoluta de un archivo…',
  '파일이 변경되었습니다. 새로고침한 뒤 다시 이동해 주세요.':
    'El archivo ha cambiado. Actualiza antes de volver a navegar.',
  '파일이 삭제되었습니다.': 'Este archivo se ha eliminado.',
  '파일이 삭제되었습니다. 다시 편집 후 저장하면 파일이 만들어집니다.':
    'Este archivo se ha eliminado. Edítalo y guárdalo para volver a crearlo.',
  '파일이나 폴더 이름을 확인해 주세요. 경로 구분자와 숨김·생성 폴더 이름은 사용할 수 없습니다.':
    'Comprueba el nombre. No se permiten separadores de ruta ni nombres reservados de carpetas ocultas o generadas.',
  '파일이나 폴더가 변경되었습니다. 다시 선택한 뒤 작업해 주세요.':
    'El archivo o la carpeta ha cambiado. Selecciónalo de nuevo antes de continuar.',
  편집: 'Editar',
  '편집 더 보기': 'Más acciones de edición',
  '편집 작업': 'Acciones de edición',
  펼치기: 'Desplegar',
  '폴더 삭제': 'Eliminar carpeta',
  '폴더를 다음 채팅 메시지에 추가했습니다.':
    'Se ha añadido la carpeta al próximo mensaje del chat.',
  '폴더와 그 안의 모든 항목을': 'Esta carpeta y todo su contenido',
  '폴더의 절대 경로': 'Ruta absoluta de la carpeta',
  '표 페이지 조절': 'Paginación de la tabla',
  '표는 처음 10,000행·100열까지 표시합니다. 전체 내용은 원문에서 확인하세요.':
    'Se muestran las primeras 10.000 filas y 100 columnas. Consulta el código fuente para ver todo el contenido.',
  '표를 읽을 수 없습니다. 구분 문자와 인용부호를 원문에서 확인해 주세요.':
    'No se puede leer esta tabla. Comprueba los delimitadores y las comillas en el código fuente.',
  '표를 표시할 수 없습니다. 원문을 확인해 주세요.':
    'No se puede mostrar esta tabla. Consulta el código fuente.',
  '표시할 내용이 없습니다.': 'No hay contenido que mostrar.',
  '표시할 시트가 없습니다.': 'No hay hojas que mostrar.',
  '표시할 파일이 없습니다.': 'No hay archivos que mostrar.',
  '표시할 행이 없습니다.': 'No hay filas que mostrar.',
  '프로젝트 파일': 'Archivos del proyecto',
  '핀치 또는 Ctrl+휠로 확대·축소합니다. 확대된 이미지는 드래그나 방향키로 이동합니다. +, -, 0, Home 키로 배율을 조절합니다.':
    'Pellizca o usa Ctrl+rueda para ajustar el zoom. Arrastra o usa las flechas para ' +
    'desplazarte. Usa +, -, 0 o Home para ajustar el zoom.',
  '행 필터링': 'Filtrar filas',
  '행 필터링…': 'Filtrar filas…',
  '현재 버전 {version}': 'Versión actual {version}',
  '현재 파일 위치로 이동': 'Mostrar archivo actual',
  '현재 파일에서 찾기…': 'Buscar en el archivo actual…',
  '화면에 맞춤': 'Ajustar a la vista',
  '휴지통을 거치지 않고 삭제합니다. 이 작업은 되돌릴 수 없습니다.':
    'se eliminará permanentemente sin pasar por la papelera. Esta acción no se puede deshacer.',
} satisfies MessageCatalog
