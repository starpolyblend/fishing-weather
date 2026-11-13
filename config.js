// 공개 설정입니다. API 인증키는 절대 입력하지 마세요.
window.APP_CONFIG = {
  title: '아빠의 낚시날씨',
  apiBase: 'https://fishing-weathrt-api.starpolyblend.workers.dev', // 예: https://fishing-weather-api.계정.workers.dev
  locations: [
    { id: 'yeolhwa', name: '열화정', description: '보성 옥평리', lat: null, lng: null },
    { id: 'hyanggyo', name: '보성향교', description: '보성읍 중앙로 58-23 주변', lat: null, lng: null }
  ],
  // 수위 관측소와 제공기관 확정 후 연결합니다. 날씨 장소와 별개입니다.
  waterStations: []
};
