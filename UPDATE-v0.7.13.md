# v0.7.13 연결 진단
웹 파일을 GitHub Pages에 올리고 worker/worker.js를 Cloudflare에 배포합니다.
기존 HRFCO_SERVICE_KEY 설정을 사용합니다.

수문 요청마다 WATER_DETAIL에 HISTORY의 CONNECT/BODY/PARSE/DONE 단계와 시간을 기록합니다.
이력 요청이 실패한 경우에만 LATEST 조회를 추가해 비교합니다.
각 요청 제한은 10초이며 비교까지 최대 약 20초 소요될 수 있습니다.
LATEST 성공만으로 그래프를 갱신하지 않습니다.
캐시 응답은 source: cache, 빈 steps로 구분합니다.
원본 응답, 인증키, 요청 URL은 진단 기록에 포함하지 않습니다.

배포 후 수문정보에서 갱신을 누르고 연결 진단을 복사해 주세요.
app과 worker가 모두 0.7.13인지 확인합니다.
실제 Cloudflare 환경의 인증키를 이용한 연결 확인은 배포 후 진행합니다.
