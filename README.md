# WebTest Automation POC

**Record → Edit → Run** 웹 테스트 자동화 툴 (M0-M1 POC)

브라우저에서 실시간으로 웹 테스트를 기록하고, 편집하며, 실행할 수 있는 Playwright 기반의 테스트 자동화 플랫폼입니다.

## 🎯 핵심 기능

- ✅ **라이브 브라우저 뷰**: 실시간 스크린샷 스트리밍으로 페이지 상태 확인
- ✅ **스마트 레코더**: 클릭/입력 자동 기록 및 안정적인 셀렉터 생성
- ✅ **Inspector 패널**: 요소 상세 정보 및 셀렉터 후보 점수화 (testid > role > text > css)
- ✅ **스크립트 에디터**: 스텝 관리 및 수동 편집
- ✅ **재생 엔진**: Playwright 기반 스크립트 실행
- ✅ **WebSocket 실시간 통신**: 브라우저 이벤트 양방향 전송
- ✅ **리사이즈 가능한 패널**: 브라우저/에디터/Inspector 영역 크기 조정

## 🏗️ 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (Next.js)                                         │
│  - React 18 + Zustand                                       │
│  - Tailwind CSS + shadcn/ui                                 │
│  - WebSocket Client                                         │
└──────────────────────┬──────────────────────────────────────┘
                       │ WebSocket
┌──────────────────────▼──────────────────────────────────────┐
│  Backend (Node.js + Fastify)                                │
│  - Playwright (Chromium)                                    │
│  - Chrome DevTools Protocol (CDP)                           │
│  - Session Manager + Recorder + Runner                      │
└─────────────────────────────────────────────────────────────┘
```

## 📦 기술 스택

### Backend
- **Node.js** + **Fastify** (고성능 웹 서버)
- **Playwright** (멀티 브라우저 자동화)
- **Chrome DevTools Protocol (CDP)** (요소 검사, 네트워크 모니터링)
- **@fastify/websocket** (실시간 통신)

### Frontend
- **Next.js 14** (React 18)
- **Zustand** (상태 관리)
- **Tailwind CSS** (스타일링)
- **Lucide Icons** (아이콘)
- **Monaco Editor** (예정 - 코드 에디터)

## 🚀 빠른 시작

### 사전 요구사항

- **Node.js 18+** 및 npm
- 최소 2GB RAM (브라우저 실행을 위해)

### 설치 및 실행

```bash
# 1. 프로젝트 디렉토리로 이동
cd /tmp/webtest-automation-poc

# 2. 의존성 설치
npm install
cd packages/backend && npm install
cd ../frontend && npm install
cd ../..

# 3. 개발 서버 실행 (백엔드 + 프론트엔드 동시)
npm run dev
```

### 개별 실행

```bash
# 백엔드만 실행
npm run dev:backend

# 프론트엔드만 실행
npm run dev:frontend
```

### 접속

- **프론트엔드**: http://localhost:3002
- **백엔드 API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

> ⚠️ **포트 3002를 사용합니다** (3000은 qa-test-manager와 충돌 방지)

## 📖 사용 방법

### 1. 세션 시작

1. 상단 헤더에서 **Base URL** 입력 (예: `https://example.com`)
2. **"세션 시작"** 버튼 클릭
3. 좌측에 라이브 브라우저 뷰가 로드됨

### 2. 레코딩

1. 상단의 **"레코드"** 버튼 클릭 (빨간색으로 변경됨)
2. 좌측 브라우저 뷰에서 페이지 요소를 클릭
3. 우측 스크립트 에디터에 자동으로 스텝이 추가됨

### 3. 요소 검사

1. 좌측 브라우저 뷰에서 요소 클릭
2. 하단 **Inspector 패널**에서 요소 정보 확인
   - **Element 탭**: 태그명, 텍스트, 속성, 바운딩 박스
   - **Selectors 탭**: 셀렉터 후보 및 점수 (복사 가능)
   - **Console 탭**: 로그 출력 (예정)

### 4. 스크립트 실행

1. 우측 스크립트 에디터에서 스텝 확인/편집
2. 상단의 **"실행"** 버튼 클릭
3. 스크립트가 자동으로 재생되며 결과 확인

### 5. 스텝 삭제

- 각 스텝 카드에 마우스 오버 → 휴지통 아이콘 클릭

## 🧪 테스트 예시

```yaml
# 예상 DSL 형식 (향후 구현)
name: 로그인_테스트
baseUrl: https://example.com
steps:
  - navigate: "/login"
  - type:
      target: { testId: "email-input" }
      value: "test@example.com"
  - type:
      target: { testId: "password-input" }
      value: "password123"
  - click: { testId: "login-button" }
  - waitFor: { urlContains: "/dashboard" }
  - assert:
      target: { testId: "welcome-message" }
      textContains: "환영합니다"
```

## 🔧 환경 변수

### Backend (`packages/backend/.env`)

```env
PORT=3001
FRONTEND_URL=http://localhost:3002
```

### Frontend (`packages/frontend/.env.local`)

```env
NEXT_PUBLIC_WS_URL=ws://localhost:3001/ws
```

> 💡 프론트엔드는 포트 3002를 사용합니다 (3000 충돌 방지)

## 📁 프로젝트 구조

```
webtest-automation-poc/
├── packages/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── browser/
│   │   │   │   ├── SessionManager.ts    # 브라우저 세션 관리
│   │   │   │   └── Recorder.ts          # 클릭/입력 기록, 셀렉터 생성
│   │   │   ├── runner/
│   │   │   │   └── Runner.ts            # 스크립트 재생 엔진
│   │   │   ├── routes/
│   │   │   │   ├── http.ts              # REST API
│   │   │   │   └── websocket.ts         # WebSocket 핸들러
│   │   │   └── index.ts                 # 서버 진입점
│   │   └── package.json
│   └── frontend/
│       ├── src/
│       │   ├── app/
│       │   │   ├── layout.tsx
│       │   │   ├── page.tsx
│       │   │   └── globals.css
│       │   ├── components/
│       │   │   ├── TestAutomationUI.tsx  # 메인 레이아웃
│       │   │   ├── Header.tsx            # 헤더 (URL, 컨트롤)
│       │   │   ├── LiveBrowserView.tsx   # 브라우저 뷰
│       │   │   ├── ScriptEditor.tsx      # 스크립트 에디터
│       │   │   └── InspectorPanel.tsx    # Inspector 패널
│       │   └── lib/
│       │       └── store.ts              # Zustand 상태 관리
│       └── package.json
├── package.json                          # Workspace root
└── README.md
```

## 🎨 UI 레이아웃

```
┌────────────────────────────────────────────────────────────────┐
│ 헤더: [Base URL 입력] [세션 시작] [레코드 ⬤] [실행 ▶] [저장]      │
├──────────────────────────┬─────────────────────────────────────┤
│  좌: Live 브라우저        │  우: 스크립트 에디터                   │
│  - 주소 표시줄            │  - 스텝 리스트 (드래그 정렬)           │
│  - 스크린샷 뷰            │  - 스텝 추가/삭제                      │
│  - 클릭 → Inspector       │                                      │
├──────────────────────────┴─────────────────────────────────────┤
│ 하단: Inspector / Console / Network                             │
│  - Element: 태그, 속성, HTML                                     │
│  - Selectors: 셀렉터 후보 + 점수 + 고유성                         │
└────────────────────────────────────────────────────────────────┘
```

## 🔍 셀렉터 점수 알고리즘

| 우선순위 | 타입       | 점수 | 설명                                    |
|---------|-----------|------|----------------------------------------|
| 1       | testid    | 40   | data-testid, data-qa, data-test        |
| 2       | role      | 25   | ARIA Role + Accessible Name            |
| 3       | text      | 15   | 텍스트 콘텐츠 (50자 이하)                |
| 4       | css       | 5-10 | ID (동적 ID는 5점), Class               |
| 5       | xpath     | 0    | 최후의 수단 (미구현)                     |

**고유성 지표**: 1 = 유일한 매칭 (✓), >1 = 여러 매칭 (경고)

## 🚧 현재 제한사항 (MVP)

### 실시간 상호작용
- ⚠️ **스크린샷 기반 UI** - 실제 페이지가 아닌 스크린샷으로 표시됨
  - 백엔드 헤드리스 브라우저에서 실행 중
  - 클릭은 실제로 전달되지만 약간의 지연 있음
  - 향후 VNC 스트리밍 또는 CDP 원격 입력으로 개선 예정
  - 자세한 내용: [INTERACTIVE_MODE_PROPOSAL.md](./INTERACTIVE_MODE_PROPOSAL.md)

### 기능
- ✅ **클릭 자동 기록** (레코딩 모드)
- ⏳ **타이핑 이벤트 수동 추가만 가능**
- ⏳ **Shadow DOM / iframe 미지원**
- ⏳ **네트워크 패널 미구현**
- ⏳ **콘솔 로그 미구현**
- ⏳ **DSL YAML 편집/파싱 미구현** (JSON만 지원)
- ⏳ **Monaco 에디터 미통합**
- ⏳ **스크립트 저장/불러오기 미구현**
- ⏳ **멀티 브라우저 지원 미구현** (Chromium만)
- ⏳ **CI 러너 미구현**

## 🛣️ 로드맵

### ✅ M0-M1 (완료)
- [x] 기본 프로젝트 구조
- [x] Playwright + CDP 통합
- [x] 라이브 스크린샷 스트리밍
- [x] 클릭 기록 (CDP DOM.getNodeForLocation)
- [x] Inspector 패널
- [x] 셀렉터 점수화
- [x] 재생 엔진

### 🔜 M2 (다음 단계)
- [ ] 타이핑 이벤트 자동 기록
- [ ] Assertion 명령 추가
- [ ] 네트워크 패널 + HAR 수집
- [ ] 스크린샷 아티팩트 저장
- [ ] 데이터셋 반복 (CSV/JSON)
- [ ] 프로젝트 저장/불러오기

### 🎯 M3-M4
- [ ] DSL ↔ Playwright 코드 양방향 변환
- [ ] Monaco 에디터 통합
- [ ] 네트워크 모킹
- [ ] CI 러너 (GitHub Actions)
- [ ] 팀 협업 기능
- [ ] 플러그인 API

## 🐛 문제 해결

### 백엔드가 시작되지 않음

```bash
# Playwright 브라우저 설치
cd packages/backend
npx playwright install chromium
```

### WebSocket 연결 실패

- 백엔드가 3001 포트에서 실행 중인지 확인
- CORS 설정 확인 (`FRONTEND_URL` 환경 변수)

### 스크린샷이 표시되지 않음

- 브라우저 콘솔에서 에러 확인
- 네트워크 탭에서 WebSocket 연결 상태 확인
- Base64 인코딩 오버헤드로 인한 지연 가능 (대용량 페이지)

## 📄 라이선스

MIT License - 자유롭게 사용 및 수정 가능

## 🤝 기여

이슈 및 PR 환영합니다!

## 📧 문의

프로젝트 관련 문의는 이슈를 통해 남겨주세요.

---

**Built with ❤️ using Playwright + Next.js + Fastify**

