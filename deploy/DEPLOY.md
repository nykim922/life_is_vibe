# 캠퍼스 비서 EC2 배포 가이드

이 문서는 **AWS EC2 한 대**에서 프론트엔드(React/Vite 정적 빌드)와 백엔드(Node.js/Express)를
함께 운영하는 방법을 설명합니다. 구성은 다음과 같습니다.

```
브라우저 ──HTTPS──▶ Nginx (80/443, 외부 공개)
                     ├─ /            → React 정적 파일(dist) + SPA fallback
                     └─ /api/*       → 리버스 프록시 → Express (127.0.0.1:8787, 내부 전용)
                                          └─ Google OAuth / Calendar API 호출
```

- Express(8787)는 **외부에 열지 않습니다.** 반드시 Nginx 를 통해서만 접근합니다.
- 프론트/백엔드가 **같은 도메인**을 쓰므로 CORS 문제가 없습니다.

---

## 0. 사전 준비 (도메인 · HTTPS)

Google OAuth 는 운영 환경에서 **HTTPS 도메인**을 요구합니다. 따라서 배포 전에 다음이 필요합니다.

1. **도메인** (예: `campus.example.com`) — Route 53 또는 기존 등록기관에서 EC2 로 A 레코드 연결
2. **HTTPS 인증서** — Let's Encrypt(certbot) 무료 인증서 권장

> ⚠️ 실제 도메인이 아직 없다면 OAuth Redirect URI 를 EC2 Public IP 로 확정하지 마세요.
> Google 은 원칙적으로 IP 주소 Redirect URI 를 허용하지 않습니다. 먼저 도메인을 준비하세요.

---

## 1. EC2 기본 설정

```bash
# Node.js 20 설치 (Ubuntu 예시)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs nginx git

# 전용 사용자 생성 (권장)
sudo useradd -r -s /usr/sbin/nologin campus

# 배포 디렉터리
sudo mkdir -p /var/www/campus-secretary
sudo mkdir -p /var/lib/campus-secretary            # 세션/토큰 저장소
sudo chown -R campus:campus /var/lib/campus-secretary
```

보안 그룹: **인바운드 80, 443만 허용.** 8787 포트는 절대 열지 않습니다.

---

## 2. 코드 배포

```bash
cd /var/www/campus-secretary
sudo git clone -b nykim <레포주소> .
# 또는 로컬에서 빌드 결과를 rsync/scp 로 업로드
```

### 2-1. 프론트엔드 빌드

```bash
cd /var/www/campus-secretary
npm ci
npm run build          # dist/ 생성 (Nginx 가 이 폴더를 서빙)
```

### 2-2. 백엔드 빌드

```bash
cd /var/www/campus-secretary/server
npm ci
npm run build          # dist/ 생성 (dist/index.js 실행)
```

### 2-3. 백엔드 환경변수 작성

```bash
cd /var/www/campus-secretary/server
cp .env.example .env
nano .env              # 아래 값들을 실제 값으로 채움
```

`.env` 에 채워야 하는 값 (자세한 설명은 `server/.env.example` 참고):

| 변수 | 설명 |
|------|------|
| `NODE_ENV` | `production` |
| `HOST` / `PORT` | `127.0.0.1` / `8787` (내부 전용) |
| `SESSION_SECRET` | 긴 랜덤 문자열 |
| `TOKEN_ENC_KEY` | 또 다른 긴 랜덤 문자열 (토큰 암호화) |
| `SESSION_DB_DIR` | `/var/lib/campus-secretary` |
| `API_KEY` | 해커톤 AI 게이트웨이 키. 기존 루트 `.env`에 있으면 그대로 재사용 가능 |
| `AI_BASE_URL` / `AI_MODEL` | 제공받은 게이트웨이 주소 / 모델 별칭 |
| `APP_BASE_URL` | `https://campus.example.com` |
| `GOOGLE_CLIENT_ID` | Google Cloud Console 에서 발급 |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console 에서 발급 |
| `GOOGLE_REDIRECT_URI` | `https://campus.example.com/api/auth/google/callback` |

랜덤 문자열 생성:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## 3. 백엔드 자동 실행 (systemd)

```bash
sudo cp deploy/campus-secretary.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now campus-secretary
sudo systemctl status campus-secretary          # active(running) 확인
curl http://127.0.0.1:8787/api/health           # {"ok":true,...} 확인
```

---

## 4. Nginx 설정

```bash
sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/campus-secretary
sudo nano /etc/nginx/sites-available/campus-secretary   # your-domain.example.com 을 실제 도메인으로 수정
sudo ln -s /etc/nginx/sites-available/campus-secretary /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default             # 기본 사이트 제거(선택)
sudo nginx -t && sudo systemctl reload nginx
```

### 4-1. HTTPS 인증서 발급 (certbot)

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d campus.example.com
```

certbot 이 자동으로 443 블록과 인증서 경로를 구성하고 갱신 타이머를 등록합니다.

---

## 5. Google Cloud Console 설정

1. https://console.cloud.google.com → 프로젝트 생성/선택
2. **API 및 서비스 → 라이브러리** 에서 **Google Calendar API** 사용 설정
3. **OAuth 동의 화면** 구성
   - 사용자 유형: 외부(External)
   - 앱 이름, 지원 이메일 입력
   - **범위(Scopes)** 추가: `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile`,
     `https://www.googleapis.com/auth/calendar.events`
   - 테스트 단계에서는 **테스트 사용자**에 로그인할 구글 계정을 추가
4. **사용자 인증 정보 → OAuth 클라이언트 ID 만들기**
   - 애플리케이션 유형: **웹 애플리케이션**
   - **승인된 리디렉션 URI**: `https://campus.example.com/api/auth/google/callback`
     (`.env` 의 `GOOGLE_REDIRECT_URI` 와 **정확히 일치**해야 함)
   - 발급된 **클라이언트 ID / 시크릿**을 `.env` 에 입력

> 개발(로컬)에서는 리디렉션 URI 에 `http://localhost:5173/api/auth/google/callback` 를 함께 등록하면 됩니다.

---

## 6. 배포 후 업데이트

```bash
cd /var/www/campus-secretary
git pull origin nykim
npm ci && npm run build                    # 프론트 재빌드
cd server && npm ci && npm run build       # 백엔드 재빌드
sudo systemctl restart campus-secretary    # 백엔드 재시작
sudo systemctl reload nginx                # (정적 파일만 바뀌면 reload 불필요)
```

---

## 7. 점검 체크리스트

- [ ] `curl http://127.0.0.1:8787/api/health` → `{"ok":true,"googleConfigured":true}`
- [ ] 브라우저에서 `https://도메인` 접속 → 로그인 화면 표시
- [ ] "구글로 로그인하기" → 구글 동의 화면 → 앱 복귀 후 로그인 유지
- [ ] 새로고침해도 로그인 유지 (세션 복원)
- [ ] 공지 상세 → 일정에 추가 → 실제 구글 캘린더에 일정 생성 + 링크 표시
- [ ] 프로필 → 로그아웃 → 로그인 화면으로 복귀 (프로필 데이터는 유지)
