# v0.2.0 업데이트

현재 적용 방법과 제한사항은 [UPDATE-v0.2.0.md](UPDATE-v0.2.0.md)를 먼저 읽으세요. 아래는 초기 구축 안내입니다.

# 아빠의 낚시날씨 v0.1.0

70세 안드로이드 사용자를 위한 큰 글씨 낚시 날씨 웹입니다. GitHub Pages가 화면을 제공하고 Cloudflare Worker가 기상청 API를 대신 호출합니다. PC를 켜둘 필요가 없습니다.

## 이번 버전의 범위와 남은 설정

- 날씨정보 / 수문정보 상위 메뉴, 최대 4개 장소 버튼(2열), 오늘·내일, 시간별 기온·강수확률·1시간 강수량·풍속.
- 2개 장소 이름: 열화정(사용자 지정: 보성 옥평리), 보성향교(보성읍 중앙로 58-23 주변).
- **실제 낚시 포인트 좌표는 미확정입니다. config.js의 lat/lng는 null입니다. 정확한 좌표를 넣기 전에는 실제 날씨를 표시하지 않습니다.** 검색되는 문화유산 열화정은 득량면 오봉리에 있어 옥평리 포인트와 구분해야 합니다.
- **수문 탭은 준비 화면과 공식 사이트 링크까지 구현했습니다. 수위 API 연동은 아직 구현하지 않았습니다.** 원하는 관측소와 기관이 정해져야 그 데이터 형식에 맞춰 연결할 수 있습니다. 임의의 관측소나 예시 수위를 실제처럼 표시하지 않습니다.
- 날씨 Worker 코드와 모의 응답 테스트는 제공하지만, 사용자의 실제 인증키로 외부 API를 호출한 검증은 수행하지 않았습니다.
- 일반 화면에는 예시 날씨가 없습니다. `?demo=1`에서만 명확한 ‘예시’ 표식과 함께 UI를 볼 수 있습니다.

## 1. GitHub에 올리기

1. 압축을 풀고 GitHub에서 새 저장소를 만듭니다. 예: `fishing-weather`.
2. 압축파일 자체가 아니라 **폴더 안의 파일과 하위 폴더**를 저장소 최상위에 올립니다. 최상위에 index.html, config.js, app.js가 있어야 합니다.
3. 저장소 Settings → Pages에서 Build and deployment의 Source를 `Deploy from a branch`로 선택합니다.
4. Branch는 `main`, 폴더는 `/(root)`로 저장합니다. 공개 범위와 Pages 지원 여부는 사용 중인 GitHub 요금제에 따릅니다.
5. 게시 완료 후 안내된 사이트 주소를 엽니다. 보통 `https://계정.github.io/fishing-weather/`입니다.

처음에는 ‘날씨 연결을 준비하고 있어요’가 정상입니다. 사이트 주소 뒤에 `?demo=1`을 붙이면 예시 화면을 볼 수 있습니다.

## 2. Cloudflare Worker 만들기 (웹 화면으로 가능)

1. Cloudflare 대시보드의 Workers & Pages에서 Worker를 새로 만듭니다. 이름 예: `fishing-weather-api`.
2. 기본 Worker를 만든 후 코드 편집 화면(Edit code)을 엽니다.
3. `worker/worker.js` 파일의 **전체 내용**으로 기존 코드를 교체하고 배포합니다. 단일 파일이므로 별도의 npm 설치가 필요하지 않습니다.
4. 생성된 Worker URL을 기록합니다. 예: `https://fishing-weather-api.계정.workers.dev`.
5. Worker의 Settings → Variables and Secrets에서 아래 항목을 등록하고 적용/배포합니다. 대시보드의 메뉴 이름은 변경될 수 있습니다.

| 이름 | 유형 | 입력할 값 |
|---|---|---|
| `KMA_SERVICE_KEY` | **Secret** | 발급받은 기상청 일반 인증키. 공공데이터포털의 Decoding 키 권장. Encoding 키도 한 번만 디코딩해 처리 |
| `KMA_PROVIDER` | Text | 공공데이터포털 키면 `data-go-kr`, 기상청 API허브 키면 `apihub` |
| `ALLOWED_ORIGINS` | Text | `https://본인계정.github.io`처럼 사이트의 출처. **저장소 경로와 끝의 /는 제외** |
| `ALLOWED_GRIDS` | Text, 선택 | setup.html이 알려주는 `x,y;x,y` 형식. 등록한 격자로 요청을 제한 |

여러 사이트를 허용할 때는 ALLOWED_ORIGINS를 쉼표로 구분합니다. CORS는 브라우저 출처 제한이며 인증 수단이 아닙니다. 공개 주소의 비브라우저 호출까지 막지는 않습니다. Worker는 5분 캐시를 사용하며, 필요하면 Cloudflare의 호출 한도/속도 제한을 별도로 설정하세요.

**인증키를 config.js, HTML, GitHub, 채팅에 넣지 마세요.** Worker의 Secret에만 등록하면 됩니다. `wrangler.toml`에도 입력하지 마세요.

### 어느 인증키인가요?

- `data.go.kr`에서 발급: `KMA_PROVIDER=data-go-kr`. 해당 키 외에 **기상청_단기예보 조회서비스(15084084)**의 활용신청이 승인되어 있어야 합니다.
- `apihub.kma.go.kr`에서 발급: `KMA_PROVIDER=apihub`. 단기예보 API 이용 권한이 있어야 합니다.
- 키만 만들었다고 모든 API의 이용 권한이 생기는 것은 아닙니다.
- 수위 데이터는 별도 기관 API의 활용신청/인증이 필요할 수 있습니다.

## 3. 두 장소의 위치와 Worker 주소 연결

1. 실제 낚시 지점을 지도에서 확인하여 위도·경도를 준비합니다. 문화시설 주소가 아니라 실제 낚시 포인트를 써도 됩니다.
2. 게시한 사이트의 `setup.html`을 엽니다. 예: `https://계정.github.io/fishing-weather/setup.html`.
3. Worker 주소와 두 장소의 위도·경도를 입력합니다. 장소 3·4는 이름을 비워 둡니다.
4. `config.js 내려받기`를 누릅니다.
5. 내려받은 파일로 GitHub 최상위의 `config.js`를 교체합니다.
6. Pages 배포 완료 후 날씨 사이트를 새로고침합니다.

설정 페이지는 서버를 수정하거나 키를 보관하지 않고, 새 공개 설정 파일만 만듭니다. 다른 방문자가 이 페이지를 열어도 저장소/사이트 설정을 바꿀 수 없습니다.

위경도는 표준 기상청 Lambert 격자로 변환합니다. 가까운 두 지점은 같은 약 5km 격자에 속해 예보가 똑같을 수 있습니다. 장소별 차이를 임의로 만들어내지 않습니다.

## 4. 작동 확인

1. `https://Worker주소/api/health`를 엽니다. `weatherKeyConfigured`와 `originsConfigured`가 true인지 확인합니다. 이 결과는 **키 등록 여부만** 뜻하며 실제 인증 성공 여부는 아닙니다.
2. 사이트에서 날씨를 불러온 뒤 발표 시각과 격자를 확인합니다.
3. 오늘/내일과 장소를 바꾸고, 새로고침을 누릅니다.
4. 실제 값이 기상청의 같은 격자·날짜·시간 예보와 맞는지 비교합니다.
5. 안드로이드 Chrome 메뉴 → 홈 화면에 추가. 설치 또는 바로가기 형태는 브라우저 환경에 따라 다릅니다.

예보는 02/05/08/11/14/17/20/23시 발표 기준으로 조회합니다. 발표 직후 지연을 고려해 15분 여유를 두며, NO_DATA면 이전 발표를 최대 두 번 더 시도합니다. 날짜 계산은 한국 시간입니다. 기상청 응답은 페이지를 끝까지 읽어 내일 예보 누락을 방지합니다.

강수량은 일 누적량이 아닌 **해당 예보 시간의 1시간 예상량**입니다. `<1mm`나 구간형 값은 원문 표현을 보존합니다. 눈·진눈깨비가 있을 때는 날씨 상태에 따로 표시하며 적설량은 이 버전 범위에 없습니다.

## 5. 수문정보 연결 시 필요한 것

- 아버지가 평소 보는 수위 화면의 URL 또는 관측소 이름.
- 원하는 자료가 하천 수위인지, 댐/보 저수위인지 확인.
- 선택한 제공기관의 API 이용 권한과 관측소 코드.

이 정보를 확인한 뒤 Worker에 `/api/water`를 추가하고 수문 화면을 연결하는 후속 작업이 필요합니다. `waterStations`는 향후 설정을 위한 자리이며 현재 사용되지 않습니다.

K-water 수문 운영 정보는 관리 대상 댐/보의 저수위(EL.m) 등을 제공합니다. 하천 수위나 낚시터 수심과 같은 뜻이 아닙니다. 가까운 관측소라고 해당 낚시터 수위를 대표한다고 단정하지 않습니다.

## 오류 해결

| 화면/문제 | 확인할 내용 |
|---|---|
| 날씨 연결을 준비하고 있어요 | config.js의 apiBase가 비어 있는지 |
| 장소 위치를 확인 중입니다 | 해당 장소의 lat/lng가 null인지 |
| Failed to fetch / 연결 실패 | Worker URL, 배포 상태, ALLOWED_ORIGINS의 정확한 출처, 인터넷 |
| 인증키 또는 활용신청 오류 | 키 발급기관, KMA_PROVIDER, 해당 서비스 승인 상태 |
| 방금 발표된 자료 없음 | API 제공 지연 가능. 잠시 후 재시도 |
| 같은 날씨가 두 장소에 표시 | 같은 예보 격자일 수 있음. 화면 하단 격자 확인 |
| 수정 후 이전 화면이 보임 | Pages 배포 완료 여부 확인 후 브라우저 새로고침 |

오래된 날씨를 최신처럼 보여주지 않기 위해 서비스워커 오프라인 캐시를 사용하지 않습니다. 인터넷이 끊기면 오류를 표시합니다. 발표 후 6시간 이상 경과한 자료에는 안내를 표시합니다. 열어 둔 앱으로 돌아오면 다시 갱신합니다.

## 개발

별도 빌드 없이 HTML/CSS/JS를 제공합니다. Node.js가 있다면 저장소에서 `npm test`로 모의 테스트를 실행합니다. 추가 패키지 설치는 필요 없습니다.

CLI 배포를 선호하면 `worker` 폴더에서 Wrangler를 사용하세요. `wrangler.toml`의 허용 출처를 먼저 수정하고, `npx wrangler secret put KMA_SERVICE_KEY`로 키를 등록한 뒤 `npx wrangler deploy`합니다. 이 과정의 로그인과 배포는 사용자가 수행합니다.

## 공식 자료

- 기상청 단기예보 API: https://www.data.go.kr/data/15084084/openapi.do
- 기상청 API허브: https://apihub.kma.go.kr/apiList.do?seqApi=10
- K-water 수문 운영 정보: https://www.data.go.kr/data/15099110/openapi.do
- 국가수자원관리종합정보시스템: https://www.wamis.go.kr/
- Cloudflare Secrets: https://developers.cloudflare.com/workers/configuration/secrets/
- GitHub Pages 게시 소스 설정: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

날씨 자료 출처: 기상청. 앱 화면과 문서는 기상청 공식 서비스가 아닙니다.
