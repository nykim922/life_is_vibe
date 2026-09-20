# 개인정보처리방침 페이지 구현 및 배포 안내

작성일: 2026-09-20. 상태: 초안 구현·로컬 검증 완료, 운영 배포 안 함.

## 현재 구조

- React 18 + TypeScript + Vite. 별도 라우터 없이 App.tsx에서 화면을 선택한다.
- HTTPS 정적 파일 위치: /usr/share/nginx/html. Nginx의 `try_files $uri $uri/ /index.html`이 SPA 경로를 처리한다.
- 조사 시 API 프록시는 127.0.0.1:4000, 별도 배포 체크아웃은 /home/ec2-user/campusfit-release (nykim, d03807a)이다. 이전 로그인 복구 기록의 8787 설명보다 현재 Nginx 설정을 우선한다.
- 두 체크아웃의 src 디렉터리는 이번 개인정보 페이지 변경 전 동일했다. 운영 백엔드에는 추가 OAuth/Calendar 수정이 있으므로 작업 디렉터리의 백엔드를 덮어쓰지 않는다.

## 이번 변경 파일

1. src/App.tsx — StoreProvider보다 먼저 /privacy 및 /privacy/ 공개 경로 처리. 로그인·로딩·온보딩·홈 등 탭 화면에 하단 링크.
2. src/screens/Privacy.tsx — 페이지 제목, 초안 표시, 목차, 정책 본문, 홈 이동과 Google 안내 링크.
3. src/screens/Privacy.css — 모바일·데스크톱·인쇄 스타일.
4. src/components/PrivacyFooter.tsx — 개인정보처리방침 하단 링크.
5. src/components/PrivacyFooter.css — 하단 링크 스타일.
6. src/data/privacyPolicy.json — 정책 본문 원본. 운영자 요청대로 미확인 항목은 ‘미확정’으로 표시.
7. deploy/PRIVACY-DRAFT.md — 검토용 정책 전문. JSON 변경 시 함께 갱신한다.
8. deploy/PRIVACY-REVIEW.md — 이 문서.

Google 로그인, 인증 상태 판단, Calendar 요청, 서버 환경변수·데이터·서비스·Nginx·인증서는 이번 작업에서 변경하지 않았다. 이전 작업의 미커밋 변경은 유지했다.

## 사실 확인 근거

| 내용 | 확인한 코드 또는 설정 |
| --- | --- |
| Google ID·이메일·이름 저장, 이메일 확인, 사진 URL 반환 후 미저장 | server/src/google/userInfo.ts, 운영 체크아웃의 server/src/routes/auth.ts |
| OAuth 권한, 접근·갱신 토큰 | server/src/config.ts, server/src/google/oauthClient.ts |
| Calendar 생성, 선택 주간·겹침 구간의 primary 일정 조회, 충돌 시 ID 조회 | 운영 체크아웃의 server/src/google/calendar.ts, server/src/routes/calendar.ts |
| Google에 전달하는 제목·설명·원문 링크·일시·알림 | server/src/calendar/buildEvent.ts |
| 토큰 AES-256-GCM 암호화, 계정·일정 이력 파일, 자동 삭제 부재 | server/src/store/tokenStore.ts (두 체크아웃 동일) |
| 7일 rolling 세션, 만료 세션 정리 주기 1시간 | server/src/session.ts |
| 프로필·앱 데이터 localStorage, 초기화는 서버 이력 미삭제 | src/data/storage.ts, src/store.tsx, src/screens/ProfileScreen.tsx |
| 외부 AI에 전공·학년·관심·목표·자유 입력·공지 전송 | src/data/aiClient.ts, 운영 체크아웃의 server/src/ai/aiClient.ts |
| IP·요청·브라우저 등 접속 로그, callback access_log off | /etc/nginx/nginx.conf, /etc/nginx/default.d/life-is-vibe.conf |
| 일 단위 Nginx 로그 순환, 순환본 10개 | /etc/logrotate.d/nginx |

사용자 데이터 파일이나 로그 내용을 열어 개인정보를 수집하지 않고 코드와 설정으로 조사했다.

## 미확정 사항

- 운영자 또는 단체명, 개인정보 담당자·문의 이메일, 시행일.
- 계정·토큰·일정 이력과 로그·백업 보관 기간 및 완전 삭제 절차·기한.
- AWS 리전·국가, 백업·복제 위치, 접근 담당자.
- AI 게이트웨이 운영자·최종 처리업체·국가·보관 기간·모델 학습 사용 여부. OpenAI SDK 사용만으로 실제 처리업체를 OpenAI라고 기재하지 않았다.
- 위탁/제공 및 국외 이전 세부 사항, 변경 고지 방식.
- Google Limited Use 준수 운영 확약과 광고·판매·사람의 열람·학습 관련 운영 방침.

현재 코드의 연결 해제 API는 전체 개인정보 삭제 기능이 아니다. 앱 내 삭제 버튼도 Google 일정과 서버 이력을 지우지 않는다. 따라서 ‘탈퇴 즉시 모든 데이터 삭제’ 등의 문구는 넣지 않았다.

Google 문서상 calendar.events는 일정 조회·편집 범위이므로 ‘생성 전용 권한’이라고 표현하지 않았다. Google은 실제 데이터 접근·이용·저장·공유 방식의 정확한 공개를 요구한다. 미확정 항목이 남은 이 초안만으로 OAuth 프로덕션 심사 요건 충족을 보장할 수 없다.

- https://developers.google.com/workspace/calendar/api/auth
- https://developers.google.com/terms/api-services-user-data-policy
- https://developers.google.com/identity/protocols/oauth2/production-readiness/policy-compliance

## 검증

- `npm run build -- --outDir /tmp/campusfit-privacy-review-dist` 성공. 기존 운영 디렉터리와 기존 dist에 배포하지 않았다.
- 실제 생성 JS를 DOM 환경에서 실행: /privacy, /privacy/, 쿼리·앵커 URL, 인증된 상태의 /privacy 모두 정책 표시.
- 정책 페이지에서 인증·Calendar API 요청 0건, localStorage 변경 없음.
- 미로그인 루트는 로그인 화면 및 링크, 인증된 루트는 기존 홈·내비게이션 및 링크 표시.
- `git diff --check` 통과. 실제 브라우저의 시각 검증 및 공개 URL 검증은 미실시.
- 운영 index.html과 기존 JS의 작업 전후 SHA-256 동일. 운영 배포·백엔드 재시작·Nginx 재로드 안 함.

## 승인 후 배포 방법 (아직 실행하지 않음)

1. 정책 내용을 검토하고 공개 승인을 받는다. 현재 본문은 ‘검토용 초안 / 미확정’ 표시를 포함한다.
2. 운영 체크아웃과 이번 작업의 변경 파일을 다시 비교하여 이번 프론트엔드·문서 변경만 반영한다. 백엔드·.env·데이터 파일은 복사하지 않는다.
3. 프론트엔드 빌드 후 /privacy와 홈·로그인 링크를 검증한다. 이번 검증 빌드는 /tmp/campusfit-privacy-review-dist에 있다. 내용 변경 시 새로 빌드한다.
4. /usr/share/nginx/html 및 /etc/nginx를 날짜별 별도 경로에 백업한다.
5. `sudo nginx -t`가 통과한 뒤 새 assets를 먼저 복사한다. 이전 assets는 유지한다. 새 index.html은 임시 파일로 복사한 다음 동일 파일시스템에서 이름 변경으로 원자적으로 교체한다.
6. 현행 try_files로 /privacy가 동작하므로 Nginx 설정 변경·인증서 작업·백엔드 재시작은 필요 없다.
7. 쿠키 없는 브라우저에서 https://campusfit.duckdns.org/privacy 직접 접속·새로고침·모바일 보기, 홈 및 로그인 화면의 링크를 확인한다. 루트의 로그인 보호와 기존 OAuth·Calendar 동작도 확인한다.
8. 문제 발생 시 백업 index.html을 복원한다. 이전 assets를 유지했으므로 즉시 이전 프론트엔드로 돌아갈 수 있다.

사용자가 ‘실제 서버 배포는 확인 없이 하지 말라’고 요청했으므로 이번 작업은 배포 직전 상태에서 종료한다.
