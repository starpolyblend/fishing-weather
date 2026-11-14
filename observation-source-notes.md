# 관측자료 출처 (2026-11-14 확인)
- 관측 화면: https://www.weather.go.kr/w/observation/land/aws-obs.do
- 홈페이지 스크립트: https://www.weather.go.kr/w/resources/js/app-2021/app-obs-climate-land-aws-obs.js
- 관측소 목록: 관측 화면의 sidoStations 변수 (awsId, nameKo, lat, lon)
- 공개 JSON 조회: https://www.weather.go.kr/w/observation/land/aws-obs-data.do?db=MINDB_01M&tm=&stnId=0&sidoCode=1200000000&sort=&config=
- 필드: items[].awsStnId, awsPcpDay, tm. 지점별 tm을 사용합니다.
- 일강수 의미: https://www.weather.go.kr/wnuri_help/html/observation/aws-table.jsp (오늘 00시 01분부터 자료시각까지)
- 근접 관측소는 웹에 설정된 좌표와 기상청 목록 사이 구면 직선거리로 결정했습니다. 관측값에 따라 다른 관측소로 자동 전환하지 않습니다.
- 공개 홈페이지 조회 경로이므로 제공기관 변경 시 수정이 필요할 수 있습니다.
