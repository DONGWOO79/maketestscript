# 아키텍처 설계 문서

## 시스템 개요

WebTest Automation POC는 Playwright와 Chrome DevTools Protocol(CDP)을 활용한 웹 테스트 자동화 플랫폼입니다.

## 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Port 3002)                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  React Components                                        │   │
│  │  - TestAutomationUI (레이아웃)                            │   │
│  │  - Header (컨트롤)                                        │   │
│  │  - LiveBrowserView (스크린샷 뷰)                          │   │
│  │  - ScriptEditor (스텝 리스트)                             │   │
│  │  - InspectorPanel (요소 검사)                             │   │
│  └──────────────────────┬───────────────────────────────────┘   │
│                         │                                        │
│  ┌──────────────────────▼───────────────────────────────────┐   │
│  │  Zustand Store (상태 관리)                                │   │
│  │  - WebSocket 연결                                         │   │
│  │  - 세션 상태                                              │   │
│  │  - 스텝 리스트                                            │   │
│  │  - Inspector 데이터                                       │   │
│  └──────────────────────┬───────────────────────────────────┘   │
└─────────────────────────┼───────────────────────────────────────┘
                          │ WebSocket
                          │ (JSON 메시지)
┌─────────────────────────▼───────────────────────────────────────┐
│                         Backend (Port 3001)                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Fastify Server                                          │   │
│  │  - HTTP Routes (REST API)                                │   │
│  │  - WebSocket Handler (실시간 통신)                        │   │
│  └──────────────────────┬───────────────────────────────────┘   │
│                         │                                        │
│  ┌──────────────────────▼───────────────────────────────────┐   │
│  │  BrowserSessionManager                                   │   │
│  │  - 브라우저 인스턴스 생성/관리                             │   │
│  │  - CDP 세션 초기화                                        │   │
│  │  - 세션별 상태 격리                                       │   │
│  └──────────────────────┬───────────────────────────────────┘   │
│           ┌─────────────┴─────────────┐                         │
│           │                           │                         │
│  ┌────────▼─────────┐     ┌──────────▼─────────┐               │
│  │  Recorder        │     │  Runner            │               │
│  │  - 클릭 캡처     │     │  - 스크립트 재생    │               │
│  │  - 셀렉터 생성   │     │  - 스텝 실행       │               │
│  │  - 점수화        │     │  - 에러 핸들링     │               │
│  └────────┬─────────┘     └──────────┬─────────┘               │
└───────────┼───────────────────────────┼─────────────────────────┘
            │                           │
            │    ┌──────────────────────┘
            │    │
    ┌───────▼────▼────────────────────────────────────────────┐
    │          Playwright (Chromium)                          │
    │  ┌───────────────────────────────────────────────────┐  │
    │  │  Chrome DevTools Protocol (CDP)                   │  │
    │  │  - DOM.enable / DOM.getNodeForLocation           │  │
    │  │  - Overlay.enable (하이라이트)                    │  │
    │  │  - Network.enable (네트워크 모니터링)             │  │
    │  │  - Log.enable (콘솔 로그)                         │  │
    │  └───────────────────────────────────────────────────┘  │
    │                                                          │
    │  ┌───────────────────────────────────────────────────┐  │
    │  │  Browser Context                                  │  │
    │  │  - 격리된 브라우저 환경                            │  │
    │  │  - 쿠키/스토리지 관리                              │  │
    │  │  - 뷰포트 설정 (1280x720)                         │  │
    │  └───────────────────────────────────────────────────┘  │
    │                                                          │
    │  ┌───────────────────────────────────────────────────┐  │
    │  │  Page (실제 웹페이지)                              │  │
    │  │  - DOM 조작                                        │  │
    │  │  - 스크린샷 캡처                                   │  │
    │  │  - 네비게이션                                      │  │
    │  └───────────────────────────────────────────────────┘  │
    └──────────────────────────────────────────────────────────┘
```

## 주요 컴포넌트

### 1. Frontend (Next.js)

#### 상태 관리 (Zustand)
- **WebSocket 연결 관리**: 자동 재연결, 메시지 큐
- **세션 상태**: sessionId, baseUrl, currentUrl, screenshot
- **레코딩 상태**: recording 플래그, steps 배열
- **Inspector 상태**: inspectedElement (SelectorInfo)
- **실행 상태**: running, currentStepIndex

#### 주요 액션
- `connect()` / `disconnect()`: WebSocket 연결
- `startSession(baseUrl)`: 새 브라우저 세션 시작
- `toggleRecording()`: 레코더 on/off
- `inspectElement(x, y)`: 요소 검사 요청
- `runScript()`: 스크립트 실행

### 2. Backend (Fastify + Playwright)

#### BrowserSessionManager
- **책임**: 브라우저 세션 생명주기 관리
- **기능**:
  - `createSession(baseUrl)`: Chromium 브라우저 + CDP 세션 생성
  - `getSession(sessionId)`: 세션 조회
  - `closeSession(sessionId)`: 세션 종료 및 정리
  - `cleanup()`: 모든 세션 정리 (graceful shutdown)

#### Recorder
- **책임**: 사용자 액션 기록 및 셀렉터 생성
- **주요 메서드**:
  - `startRecording()`: 페이지 이벤트 리스너 등록
  - `stopRecording()`: 리스너 해제
  - `handleClickAt(x, y)`: CDP로 좌표→DOM 노드 매핑 → 셀렉터 생성
  - `generateSelectors(elementInfo)`: 셀렉터 후보 생성 및 점수화
  - `addStep(step)`: 수동 스텝 추가

#### Runner
- **책임**: 테스트 스크립트 재생
- **주요 메서드**:
  - `run(steps)`: 스텝 배열 순차 실행
  - `getBestSelector(target)`: 최적 셀렉터 선택 (uniqueness=1 우선)

#### WebSocket 메시지 프로토콜

| Direction | Type | Data | Description |
|-----------|------|------|-------------|
| → Backend | `session:start` | `{ baseUrl }` | 세션 시작 요청 |
| ← Frontend | `session:started` | `{ sessionId, url, screenshot }` | 세션 시작 완료 |
| → Backend | `recorder:start` | `{}` | 레코더 시작 |
| ← Frontend | `recorder:started` | `{}` | 레코더 시작 완료 |
| → Backend | `element:inspect` | `{ x, y }` | 요소 검사 요청 |
| ← Frontend | `element:inspected` | `SelectorInfo` | 셀렉터 후보 반환 |
| ← Frontend | `step:recorded` | `TestStep` | 자동 기록된 스텝 |
| → Backend | `step:add` | `{ step }` | 수동 스텝 추가 |
| → Backend | `script:run` | `{ steps }` | 스크립트 실행 |
| ← Frontend | `script:completed` | `{ success }` | 실행 완료 |
| ← Frontend | `script:error` | `{ message, step }` | 실행 실패 |

## 데이터 모델

### TestStep
```typescript
{
  id: string;                  // UUID
  type: 'navigate' | 'click' | 'type' | 'waitFor' | 'assert';
  timestamp: number;           // Unix timestamp (ms)
  target?: SelectorInfo;       // 대상 요소 (navigate 제외)
  value?: string;              // 입력 값 (type만)
  url?: string;                // URL (navigate만)
}
```

### SelectorInfo
```typescript
{
  element: {
    tagName: string;
    outerHTML: string;         // 500자 제한
    attributes: Record<string, string>;
    boundingBox: { x, y, width, height } | null;
    textContent: string;
  };
  candidates: SelectorCandidate[];
}
```

### SelectorCandidate
```typescript
{
  selector: string;            // Playwright-style selector
  type: 'testid' | 'role' | 'text' | 'css' | 'xpath';
  score: number;               // 0-40
  uniqueness: number;          // 1 = unique, >1 = multiple matches
}
```

## 셀렉터 생성 알고리즘

### 1단계: 후보 생성
```
1. data-testid / data-qa / data-test → [data-testid="value"]
2. role + accessible name → role=button[name="Submit"]
3. text content (50자 이하) → text="Click me"
4. ID → #element-id
5. Class → tagname.class1.class2
```

### 2단계: 점수 계산
```
testid:    40점
role:      25점
text:      15점
css (id):  10점 (동적 ID는 -5점)
css (class): 5점
xpath:     0점 (미구현)
```

### 3단계: 고유성 검증
```
page.locator(selector).count() === 1 → uniqueness = 1 (선호)
page.locator(selector).count() > 1  → uniqueness = n (경고)
```

### 4단계: 정렬
```
1차: score 내림차순
2차: uniqueness 오름차순 (1이 최우선)
```

## 성능 고려사항

### 스크린샷 스트리밍
- **현재**: 전체 페이지 base64 인코딩 (오버헤드 ~33%)
- **개선 방안**: 
  - WebP 포맷 사용
  - 변경된 영역만 differential 전송
  - 프레임 레이트 제한 (500ms 간격)

### CDP 오버헤드
- **DOM.getNodeForLocation**: ~10-50ms
- **page.screenshot()**: ~100-500ms (페이지 크기 의존)
- **최적화**: 디바운싱, 요청 큐잉

### 메모리 관리
- 세션당 브라우저 인스턴스: ~100-200MB
- 컨텍스트 재사용으로 개선 가능
- 타임아웃 기반 세션 정리 (30분)

## 보안 고려사항

### CORS
- 백엔드는 `FRONTEND_URL` 환경변수로 origin 제한 (기본값: http://localhost:3002)
- WebSocket도 동일한 origin 정책
- 포트 3002 사용 (3000은 qa-test-manager와 충돌 방지)

### 입력 검증
- URL 유효성 검증 (http/https만 허용)
- 셀렉터 인젝션 방지 (Playwright가 자동 이스케이핑)

### 리소스 제한
- 사용자당 최대 세션 수 제한 필요
- 스크립트 실행 타임아웃 (5분)
- 스텝당 타임아웃 (5초)

## 확장 가능성

### 수평 확장
- 백엔드 인스턴스 다중화
- Redis로 세션 상태 공유
- Load balancer + sticky session

### 멀티 브라우저
```typescript
const browser = await playwright[browserType].launch({
  // chromium, firefox, webkit
});
```

### 플러그인 시스템
- 커스텀 커맨드 등록
- 셀렉터 전략 확장
- 리포터 확장

## 향후 개선 사항

1. **타이핑 이벤트 캡처**: MutationObserver + input 이벤트
2. **Shadow DOM 지원**: Playwright의 pierce 셀렉터
3. **네트워크 HAR 수집**: CDP Network.* 이벤트
4. **비디오 녹화**: Playwright recordVideo
5. **AI 기반 셀렉터 추천**: GPT-4로 semantic selector 생성
6. **Visual regression**: Playwright의 screenshot diff

## 참고 자료

- [Playwright API](https://playwright.dev/docs/api/class-playwright)
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)
- [Fastify WebSocket](https://github.com/fastify/fastify-websocket)
- [Zustand](https://github.com/pmndrs/zustand)

