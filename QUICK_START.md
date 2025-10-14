# 빠른 시작 가이드

## 5분 안에 시작하기 🚀

### 1. 프로젝트 복사

```bash
cp -r /tmp/webtest-automation-poc ~/webtest-automation-poc
cd ~/webtest-automation-poc
```

### 2. 의존성 설치

```bash
# Root 의존성
npm install

# 백엔드 의존성
cd packages/backend
npm install

# Playwright 브라우저 설치
npx playwright install chromium

# 프론트엔드 의존성
cd ../frontend
npm install

# Root로 돌아가기
cd ../..
```

### 3. 서버 실행

```bash
# 한 번에 백엔드 + 프론트엔드 실행
npm run dev
```

또는 별도 터미널에서:

```bash
# 터미널 1: 백엔드
cd packages/backend
npm run dev

# 터미널 2: 프론트엔드
cd packages/frontend
npm run dev
```

### 4. 브라우저로 접속

**http://localhost:3002** 열기

> ⚠️ **포트 3002**를 사용합니다 (3000은 qa-test-manager와 충돌 방지)

---

## 첫 테스트 만들기 🎬

### Step 1: 세션 시작

1. 상단 헤더의 **Base URL** 입력란에 `https://example.com` 입력
2. **"세션 시작"** 버튼 클릭
3. 좌측에 example.com 페이지가 로드됨

### Step 2: 요소 검사

1. 좌측 브라우저 뷰에서 **"More information..."** 링크 클릭
2. 하단 **Inspector 패널**에서:
   - **Element 탭**: 요소 정보 확인 (태그명: `a`)
   - **Selectors 탭**: 셀렉터 후보 확인
     - `text="More information..."` (Score: 15, Unique ✓)
   - 복사 아이콘 클릭하여 셀렉터 복사

### Step 3: 레코딩 (개발 중)

> ⚠️ **현재 MVP에서는 자동 타이핑 기록이 미구현**입니다.
> 클릭 이벤트만 자동으로 기록되며, 스텝은 수동으로 추가해야 합니다.

1. **"레코드"** 버튼 클릭 (빨간색으로 변경)
2. 페이지에서 요소를 클릭하면 우측 스크립트 에디터에 스텝이 추가됨

### Step 4: 스크립트 실행

1. 우측 **스크립트 에디터**에서 스텝 확인
2. 상단의 **"실행"** 버튼 클릭
3. 스크립트가 자동으로 재생되며 좌측 화면 업데이트

---

## 고급 사용법 🎯

### 복잡한 시나리오 예시

**목표**: GitHub 로그인 페이지 테스트 (예시)

```typescript
// 수동으로 추가해야 할 스텝들 (향후 자동화 예정)

1. Navigate to https://github.com/login
2. Click: [name="login"] (username input)
3. Type: "testuser@example.com"
4. Click: [name="password"]
5. Type: "password123"
6. Click: [name="commit"] (Sign in button)
7. Wait for URL contains "/dashboard"
8. Assert: [data-testid="user-menu"] is visible
```

### 셀렉터 선택 팁

| 우선순위 | 셀렉터 타입 | 예시 | 언제 사용? |
|---------|-----------|------|-----------|
| 1 | **testid** | `[data-testid="submit-btn"]` | 가장 안정적 (개발자가 명시적으로 지정) |
| 2 | **role** | `role=button[name="Submit"]` | 접근성 지원 앱 (ARIA 속성) |
| 3 | **text** | `text="Click me"` | 고유한 텍스트가 있을 때 |
| 4 | **css (id)** | `#submit-button` | 동적이지 않은 ID |
| 5 | **css (class)** | `button.primary-btn` | 최후의 수단 (변경 가능성 높음) |

### Inspector 패널 활용

#### Element 탭
- **TagName**: HTML 요소 타입
- **Text Content**: 요소 내부 텍스트
- **Attributes**: 모든 HTML 속성
- **Bounding Box**: 요소 위치/크기 (디버깅용)
- **Outer HTML**: 전체 HTML 소스 (500자 제한)

#### Selectors 탭
- **Type 뱃지**: 셀렉터 타입 (TESTID, ROLE, TEXT, CSS)
- **Score**: 안정성 점수 (높을수록 좋음)
- **Uniqueness**: 
  - ✓ Unique (1개 매칭) → 권장
  - N matches → 여러 요소 매칭 (주의)
- **복사 버튼**: 클립보드에 셀렉터 복사

---

## 문제 해결 🔧

### "WebSocket 연결 안 됨" 표시

**원인**: 백엔드가 실행되지 않았거나 포트 충돌

**해결**:
```bash
# 백엔드 재시작
cd packages/backend
npm run dev

# 포트 확인
lsof -i :3001  # 백엔드
lsof -i :3002  # 프론트엔드
```

### 스크린샷이 로딩되지 않음

**원인**: Playwright 브라우저 미설치 또는 CDP 오류

**해결**:
```bash
cd packages/backend
npx playwright install chromium

# 캐시 정리
rm -rf node_modules/.cache
```

### "세션 시작" 클릭해도 반응 없음

**원인**: WebSocket 메시지 전송 실패

**해결**:
1. 브라우저 개발자 도구 열기 (F12)
2. **Console 탭**: 에러 메시지 확인
3. **Network 탭**: WS 연결 상태 확인
   - Status: 101 Switching Protocols (정상)
   - Status: Failed (비정상 - 백엔드 확인)

### 요소 클릭해도 Inspector에 아무것도 안 뜸

**원인**: CDP `DOM.getNodeForLocation` 실패

**해결**:
- 스크린샷 좌표 스케일링 문제일 수 있음
- 백엔드 로그 확인: `cd packages/backend && npm run dev` (로그 출력)
- 실제 페이지 요소가 클릭 가능한 영역인지 확인

### TypeScript 컴파일 에러

**원인**: 의존성 버전 불일치

**해결**:
```bash
# 모든 node_modules 삭제 후 재설치
rm -rf node_modules packages/*/node_modules
npm install
cd packages/backend && npm install
cd ../frontend && npm install
```

---

## 다음 단계 📚

### 더 알아보기
- [README.md](./README.md) - 전체 기능 및 사용법
- [ARCHITECTURE.md](./ARCHITECTURE.md) - 시스템 아키텍처 상세
- [Playwright 문서](https://playwright.dev/docs/intro) - Playwright API 학습

### 개발 참여
```bash
# 이슈 등록
# GitHub 이슈 트래커 사용 예정

# PR 제출
git checkout -b feature/my-feature
# ... 코드 작성 ...
git commit -m "feat: add new feature"
git push origin feature/my-feature
```

### 피드백
- 🐛 버그 발견: 이슈 등록
- 💡 기능 제안: Discussion 또는 이슈
- ❓ 질문: README의 문제 해결 섹션 확인

---

**즐거운 테스트 자동화 되세요! 🎉**

