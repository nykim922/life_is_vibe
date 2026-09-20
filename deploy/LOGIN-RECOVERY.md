# CampusFit 로그인 복구 기록 — 2026-09-20 UTC

## 원인과 배포 상태

- 작업 시작 브랜치: seewoo, HEAD 9b1467a. GitHub nykim 최신: e613004.
- 최신 nykim과 src/store.tsx, src/screens/Login.tsx, server/src/routes/auth.ts는 동일했다. App.tsx에는 OAuth 미설정 시 로그인 화면을 건너뛰는 추가 조건이 있었다.
- HTTPS /api/auth/me는 쿠키 없이 authenticated:false, googleConfigured:false를 반환했다. 기존 세션 문제와 별개로 홈 접근이 가능했다.
- localStorage의 옛 loggedIn 필드는 무시하며 인증은 서버 세션으로 조회한다. 문제는 서버가 미인증으로 판정한 뒤의 화면 분기였다.
- 운영 index.html과 JS는 작업 디렉터리 dist와 SHA-256이 같았다. 원래 JS: /assets/index-B6XZqYiq.js. OAuth 코드가 없는 데모 배포가 원인은 아니었다.
- HTTPS root: /usr/share/nginx/html. 기본 index.html, location /의 try_files: $uri $uri/ /index.html.
- location /api/는 http://127.0.0.1:8787로 전달하며 X-Forwarded-Proto 등을 설정한다.
- HTTP 도메인은 HTTPS로 301 전환한다. 그 외 Host(IP 직접 접속 포함)는 Certbot 설정의 return 404를 적용한다. HTTP에 별도 프론트엔드는 없다.
- Express는 8787에서 production으로 실행 중이었으나 터미널의 npm start에 종속되어 있었다.
- 실제 실행 환경 및 발견된 배포용 환경 파일 모두 Google Client ID/Secret이 없거나 비어 있었다.

## 적용한 최소 수정

- nykim의 인증 필수 화면 분기를 반영했다. 기존 seewoo 관심 분야 UI와 추천 구현은 유지했다.
- 추천 API에 기존 requireAuth 미들웨어를 적용했다.
- OAuth 미설정 시 로그인 화면에 사용자용 안내를 표시한다.
- server/.env를 권한 0600으로 준비했다. 공개 주소, 콜백 URI, 신규 세션/암호화 키를 설정했다. 기존 루트 .env는 유지했다. 기존 세션 및 사용자 토큰 DB가 없음을 확인한 후 신규 키를 생성했다.
- campusfit-production.service로 기존 포트/데이터 경로를 유지하며 백엔드를 관리한다.
- 운영 백업: /var/backups/campusfit/20260920T055008Z (웹, Nginx 설정, 환경 파일, 데이터, 원본 커밋 소스).
- nginx -t 통과. Nginx 설정 및 인증서 변경 없음. index.html은 원자적으로 교체하고 이전 JS/CSS 파일은 유지했다.
- 새 JS: /assets/index-BzFktf3S.js. 공개 HTTPS 응답과 로컬 빌드 해시 일치.
- 브랜치 변경/커밋/push 없음. 기존 package-lock 변경 및 미추적 파일 보존.

## 검증과 남은 작업

- 프론트엔드/백엔드 빌드 성공, 백엔드 테스트 30개 통과.
- 실제 JS 빌드의 DOM 실행 검증: 미로그인, 예전 localStorage, 백엔드 장애 시 로그인 화면; OAuth 설정 시 버튼 활성화; 인증된 상태를 모의하면 홈/하단 메뉴 표시.
- 공개 HTTPS 200, /api/health 200, /api/auth/me 200 미인증 응답.
- 미인증 /api/recommend 및 /api/calendar/events는 401.
- Nginx 및 campusfit-production 서비스 active, 백엔드 자동 시작 enabled.
- 실제 Google 자격증명 미입력: /api/auth/google은 503, 로그인 버튼 비활성. OAuth 동의 화면, 실제 로그인 성공, 새로고침 세션 유지는 아직 검증하지 못했다.
- 실제 시크릿 브라우저 시각 검증은 하지 못했다. DOM 검증은 실제 Google 인증을 대체하지 않는다.
- 신규 사용자는 로그인 후 기존 온보딩을 거쳐 홈으로 이동한다.

EC2 터미널에서 `python3 deploy/configure-google.py`로 자격증명을 숨김 입력할 수 있다. 입력 후 백엔드를 재시작하고 공개 /api/health의 googleConfigured:true, Google 인증 리다이렉트, 실제 사용자 로그인 및 새로고침을 검증해야 한다. Secret/토큰을 로그나 채팅에 출력하지 않는다.
