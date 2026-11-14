# 물때 지점 선정 근거 (2026-11-14)
- 해양수산부 연안포털 공유수면 현황: 보성군 득량면 해평리 2273-1 금능항 일원
- https://coast.mof.go.kr/coastAdmin/shareSea/shareSeaStatus.do
- 국립해양조사원 /swtc/gisDataSearchList.do 에 빈 searchValue로 조회한 지점 목록 179개에서 금능항·해평항의 별도 항목 없음
- 해평항 공개 위치 출처: https://www.badatime.com/724/daily (북위34:43, 동경127:12)
- 전체 목록 위치와 위 위치의 거리를 비교해 SO_0757 안남리 선택. 정확한 항구별 자체 예보로 표시하지 않음
- 안남리 공식 지점 위도34.730278 경도127.264444
- 주간 자료 /swtc/getWeeklyData.do의 실제 JSON 필드 searchDate,obsPostName,obsLat,obsLon,dateMoon,mool8,lvl1..4,flgView를 사용
- 증감 정의 https://www.badatime.com/guide 를 참고하여 직전 반대 극치 대비 차이를 계산. 바다타임 예보 값은 사용하지 않음
- 물때 명칭은 공식 mool8 값을 표시하며 물때/음력의 자체 계산 없음

## v0.6.1 연결 변경 (이전 연결 설명보다 우선)
홈페이지 내부 getWeeklyData.do 경로는 더 이상 사용하지 않습니다.
공식 API: https://www.data.go.kr/data/15156018/openapi.do
Operation: https://apis.data.go.kr/1192136/tideFcstHghLw/GetTideFcstHghLwApiService
요청: serviceKey, obsCode=SO_0757, reqDate=YYYYMMDD, pageNo=1, numOfRows=300, type=json.
응답: body.items.item의 predcDt(예측시각), predcTdlvVl(높이 cm), extrSe(1·3 고조, 2·4 저조).
몇 물인지는 고·저조 응답 필드가 아니라 Intl의 한국 음력(dangi) 날짜와 남해 8물때식으로 계산합니다.
실제 인증키로 새 경로의 응답을 검증하지 않았으므로 배포 후 확인이 필요합니다.
