# Bondage 배포 가이드

이 문서는 Bondage 모노레포(Next.js 웹앱 + WebSocket 서버)를 운영 환경에 배포하는 방법을 설명합니다.

---

## 1. 배포 구조 요약

| 구성 요소 | 설명 |
|----------|------|
| **웹앱** | Next.js 16 (`apps/web`). API Routes, Server Actions, Better Auth 포함. |
| **WebSocket 서버** | 실시간 DM 알림용 (`apps/web/ws-server.ts`). 별도 프로세스로 실행(기본 포트 3001). |
| **DB** | PostgreSQL (Supabase 등). Drizzle ORM + Better Auth 공용. |
| **파일 저장** | AWS S3 (클래스 이미지 등). |

- **빌드**: 모노레포 루트에서 `pnpm build` → `apps/web` Next 빌드 및 의존 패키지 빌드.
- **실행**: Next는 `next start`, WS는 `pnpm --filter web ws:start` (또는 `cd apps/web && pnpm exec tsx ws-server.ts`).

---

## 2. 환경 변수

배포 시 **반드시 설정**해야 하는 변수와, 기능별 선택 변수를 정리합니다.  
실제 값은 배포 플랫폼(Vercel, Railway, 서버 셸 등)에서 설정하며, **저장소에는 커밋하지 마세요.**

### 2.1 필수(운영)

| 변수 | 설명 | 예시 |
|------|------|------|
| `DATABASE_URL` | PostgreSQL 연결 문자열 (Supabase: Project Settings > Database > Connection string URI) | `postgresql://postgres.[ref]:[pw]@...pooler.supabase.com:6543/postgres` |
| `BETTER_AUTH_SECRET` | 세션/쿠키 서명용. 32자 이상 랜덤 권장 | (비밀 값) |
| `BETTER_AUTH_URL` | 운영 도메인(스킴 포함). 로그인/콜백 기준 URL | `https://your-domain.com` |
| `BETTER_AUTH_TRUSTED_ORIGINS` | 허용 오리진(쉼표 구분). 필요 시 추가 | `https://your-domain.com,https://www.your-domain.com` |

- **Better Auth**: 운영에서는 `BETTER_AUTH_URL`을 실제 서비스 URL로 꼭 설정하고, 소셜 로그인 사용 시 해당 URL 기준으로 Redirect URI/Callback URL을 등록하세요.

### 2.2 S3 (이미지 업로드 사용 시)

| 변수 | 설명 |
|------|------|
| `S3_REGION` | 버킷 리전 (예: `ap-northeast-2`) |
| `S3_BUCKET` | 버킷 이름 |
| `S3_ACCESS_KEY_ID` | IAM 액세스 키 |
| `S3_SECRET_ACCESS_KEY` | IAM 시크릿 키 |
| `S3_PUBLIC_BASE_URL` | 버킷 공개 URL (예: `https://bucket.s3.region.amazonaws.com`) |

### 2.3 WebSocket 서버 (실시간 DM 사용 시)

WS 서버는 **Next와 별도 프로세스**로 띄웁니다. 같은 머신에 둘 때와, Next만 Vercel 등에 둘 때를 구분해 설정합니다.

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `WS_PORT` | WS 서버 리스닝 포트 | `3001` |
| `WS_TOKEN_SECRET` | WS 토큰 서명 (미설정 시 `BETTER_AUTH_SECRET` 사용) | - |
| `WS_PUBLISH_SECRET` | `/publish` API 인증 (미설정 시 `BETTER_AUTH_SECRET` 사용) | - |

**Next 앱(서버) 쪽**에서 WS로 메시지 푸시를 보낼 때 사용:

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `WS_PUBLISH_URL` | WS 서버의 publish 엔드포인트 | `http://localhost:3001/publish` |

**클라이언트(브라우저)**에서 WS 연결 주소로 사용:

| 변수 | 설명 |
|------|------|
| `NEXT_PUBLIC_WS_URL` | WebSocket URL (예: `wss://ws.your-domain.com`) |

- WS 서버를 다른 호스트에 두면: `WS_PUBLISH_URL`을 해당 서버의 `https://.../publish` 또는 `http://...:3001/publish`로, `NEXT_PUBLIC_WS_URL`을 `wss://...`로 설정합니다.

### 2.4 이메일(Resend)

| 변수 | 설명 |
|------|------|
| `RESEND_API_KEY` | Resend API 키 |
| `RESEND_FROM` | 발신 주소 (예: `Bondage <noreply@your-domain.com>`) |

미설정 시 비밀번호 재설정/아이디 찾기 시 메일만 미발송되고, 나머지 동작은 합니다.

### 2.5 관리자 / 기타

- `ADMIN_EMAIL`, `ADMIN_USERNAME`, `ADMIN_NICKNAME` 등: 루트 `.env.example` 참고.
- `INVITE_KEY_MIN_AGE_HOURS`: 가입 후 인증키 생성 가능까지 시간(시간 단위).
- 소셜 로그인: `KAKAO_*`, `NAVER_*`, `GOOGLE_*` 등 — 사용하는 provider만 설정.

---

## 3. 빌드 및 DB 마이그레이션

### 3.1 로컬에서 빌드 확인

```bash
# 루트에서
pnpm install
pnpm build
```

- `apps/web`에 `.env`(또는 배포와 동일한 환경 변수)가 있어야 합니다.  
- 모노레포이므로 루트에서 `pnpm build`를 실행해야 `@workspace/db`, `@workspace/auth`, `@workspace/ui` 등이 먼저 빌드됩니다.

### 3.2 DB 마이그레이션

배포 **전** 또는 배포 파이프라인 **첫 단계**에서 마이그레이션을 실행합니다.  
DB 접근이 가능한 환경(로컬, CI, 또는 배포 서버)에서:

```bash
pnpm db:migrate
```

- Drizzle 마이그레이션은 `packages/db` 설정을 사용하며, `DATABASE_URL`(또는 `DATABASE_*` 분리 변수)을 읽습니다.  
- Supabase 등 풀러 사용 시 연결 수 제한을 고려해, 동시에 여러 인스턴스에서 migrate를 돌리지 않도록 합니다.

### 3.3 로컬 프로덕션 모드 확인

```bash
pnpm build
pnpm --filter web start          # Next: 기본 3000 포트
pnpm --filter web ws:start       # WS: 기본 3001 포트 (다른 터미널)
```

- 브라우저에서 `http://localhost:3000` 접속 후 로그인/이미지 업로드/실시간 알림 등 핵심 기능만 점검하면 됩니다.

---

## 4. 배포 방식별 가이드

### 4.1 옵션 A: Vercel(Next) + WebSocket 서버 별도 호스트

Next.js는 Vercel에, WebSocket 서버는 별도 서비스(Railway, Render, Fly.io, EC2 등)에 두는 구성입니다.

#### Next (Vercel)

1. **프로젝트 설정**
   - Vercel에서 저장소 연결 후, **Root Directory**를 `apps/web`로 두거나,  
     루트를 기준으로 두고 **Build Command**를 `cd ../.. && pnpm install && pnpm build`처럼 상위에서 빌드하도록 설정.
   - **Output Directory**: Next 기본값 사용(설정 시 `apps/web/.next`).
   - **Install Command**: `pnpm install` (루트에서 빌드하면 루트에서 실행).

2. **환경 변수**
   - Vercel 대시보드 → Project → Settings → Environment Variables에서 위 2절의 변수 등록.
   - `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `BETTER_AUTH_TRUSTED_ORIGINS`, S3 변수, `RESEND_*`, `WS_PUBLISH_URL`, `NEXT_PUBLIC_WS_URL` 등.
   - `BETTER_AUTH_URL`: `https://your-vercel-domain.vercel.app` 또는 커스텀 도메인.
   - `WS_PUBLISH_URL`: WS 서버의 publish URL (예: `https://ws.your-domain.com/publish` 또는 `http://ws-host:3001/publish`).
   - `NEXT_PUBLIC_WS_URL`: 클라이언트가 접속할 WS URL (예: `wss://ws.your-domain.com`).

3. **빌드/실행**
   - Vercel이 `pnpm build`(또는 지정한 Build Command)를 실행하고, Next는 자동으로 `next start`에 해당하는 서빙을 합니다.  
   - **WS 서버는 Vercel에 배포하지 않습니다.** (서버리스 함수는 장기 WebSocket 연결에 부적합합니다.)

#### WebSocket 서버 (Railway / Render / Fly.io / VM 등)

1. **실행 방식**
   - `apps/web`을 기준으로 실행할 수 있도록, 루트에서 의존성을 설치한 뒤 `apps/web`에서 WS만 실행하는 방식이 안전합니다.
   - 예 (루트에서):
     ```bash
     pnpm install --frozen-lockfile
     pnpm --filter web exec tsx ws-server.ts
     ```
   - 또는 `apps/web`에 `Dockerfile.ws`를 두고, 그 안에서 `pnpm install`(루트 또는 web만) 후 `tsx ws-server.ts` 실행.

2. **환경 변수**
   - 같은 DB를 쓰므로 `DATABASE_URL` 등 DB 변수 동일.
   - `BETTER_AUTH_SECRET`(또는 `WS_TOKEN_SECRET`, `WS_PUBLISH_SECRET`) 필수.
   - `WS_PORT`: 리스닝 포트(기본 3001). 호스팅 쪽에서 해당 포트를 외부에 노출(또는 리버스 프록시로 `wss://` 제공).

3. **도메인/프록시**
   - WS 전용 서브도메인(예: `ws.your-domain.com`)을 Nginx/Caddy 등으로 `wss://` 프록시하면, 클라이언트의 `NEXT_PUBLIC_WS_URL`을 `wss://ws.your-domain.com`으로 두면 됩니다.

---

### 4.2 옵션 B: 단일 서버(VM / Docker)

Next와 WS 서버를 한 호스트에서 함께 실행하는 방식입니다.

1. **Node 설치**
   - `package.json`의 `engines`에 맞게 Node.js 20 이상 설치.

2. **소스 배포**
   - Git clone 또는 CI 아티팩트로 배포.  
   - `pnpm install --frozen-lockfile` 후 `pnpm build`.

3. **환경 변수**
   - `apps/web/.env` 또는 시스템/프로세스 매니저에서 설정.  
   - `BETTER_AUTH_URL`을 실제 도메인(예: `https://your-domain.com`)으로 설정.

4. **프로세스 실행**
   - **Next**: `pnpm --filter web start` (또는 `node apps/web/.next/standalone/server.js` 등 Next 출력 구조에 맞게).
   - **WS**: `pnpm --filter web ws:start` (별도 프로세스로 상시 실행).

5. **프로세스 매니저(PM2) 예시**

   ```bash
   # 루트에서
   pnpm build
   pm2 start "pnpm --filter web start" --name web
   pm2 start "pnpm --filter web ws:start" --name ws
   pm2 save && pm2 startup
   ```

6. **리버스 프록시**
   - Nginx/Caddy에서:
     - `https://your-domain.com` → `http://127.0.0.1:3000` (Next)
     - `wss://your-domain.com/ws` 또는 `wss://ws.your-domain.com` → `http://127.0.0.1:3001` (WS)
   - 이 경우 클라이언트 `NEXT_PUBLIC_WS_URL`을 `wss://your-domain.com/ws` 등으로 맞추고,  
     Next 앱의 `WS_PUBLISH_URL`은 내부용 `http://127.0.0.1:3001/publish`로 두면 됩니다.

7. **Docker**
   - Next용 Dockerfile과 WS용 Dockerfile(또는 멀티스테이지)을 두고, 같은 네트워크에서 Next 컨테이너와 WS 컨테이너를 띄우면 됩니다.  
   - Next는 `next build && next start`, WS는 `tsx ws-server.ts` 실행.  
   - 환경 변수는 `docker run -e ...` 또는 docker-compose `environment`로 전달.

---

## 5. Better Auth 운영 설정

- **BETTER_AUTH_URL**: 반드시 실제 서비스 URL(예: `https://your-domain.com`)로 설정.  
  - 로그인 후 리다이렉트, 쿠키 도메인, 소셜 콜백 등에 사용됩니다.
- **BETTER_AUTH_TRUSTED_ORIGINS**:  
  - 동일 도메인만 쓸 경우 `BETTER_AUTH_URL`과 같게 하나만 넣거나,  
  - `https://your-domain.com,https://www.your-domain.com` 처럼 여러 오리진을 쉼표로 구분해 설정.

**소셜 로그인(카카오/네이버/구글)**  
- 각 provider 개발자 콘솔에서 Redirect URI / Callback URL을 다음 형식으로 등록:
  - 카카오: `https://your-domain.com/api/auth/oauth2/callback/kakao`
  - 네이버: `https://your-domain.com/api/auth/oauth2/callback/naver`
  - 구글: `https://your-domain.com/api/auth/callback/google`  
- `BETTER_AUTH_URL`을 해당 도메인으로 맞춰두면 위 경로가 자동으로 사용됩니다.

---

## 6. 배포 후 체크리스트

- [ ] `BETTER_AUTH_URL` / `BETTER_AUTH_TRUSTED_ORIGINS`가 운영 도메인으로 설정됨
- [ ] `pnpm db:migrate`로 DB 스키마 최신 상태
- [ ] 로그인/로그아웃 동작
- [ ] 소셜 로그인 사용 시 Redirect URI가 운영 도메인으로 등록됨
- [ ] 이미지 업로드(S3) 동작
- [ ] 실시간 DM 사용 시 WS 서버 실행 여부, `NEXT_PUBLIC_WS_URL` / `WS_PUBLISH_URL` 일치
- [ ] 비밀번호 재설정/아이디 찾기 사용 시 `RESEND_*` 설정 및 메일 수신 확인
- [ ] PWA/캐시: Next 빌드 시 PWA 비활성화는 개발용이므로, 운영에서는 자동 활성화됨(`next.config.mjs` 기준)

---

## 7. 요약 명령어

| 목적 | 명령어 |
|------|--------|
| 전체 빌드 | `pnpm build` |
| DB 마이그레이션 | `pnpm db:migrate` |
| Next만 실행 | `pnpm --filter web start` |
| WS 서버만 실행 | `pnpm --filter web ws:start` |
| 로컬 프로덕션 테스트 | `pnpm build` 후 위 두 프로세스 각각 실행 |

환경 변수는 루트 또는 `apps/web`의 `.env`(또는 배포 플랫폼 설정)에 두고, **절대 저장소에 커밋하지 마세요.**
