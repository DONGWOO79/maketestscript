# 🎯 Interactive Browser Testing Mode

실제 브라우저 창에서 직접 작업하면서 자동으로 테스트 스크립트를 기록하는 **Headful Mode**가 활성화되었습니다!

## ✨ 주요 기능

### 1. **실제 브라우저 창** 
- Chromium 브라우저 창이 실제로 열립니다
- 최대화된 상태로 시작
- 일반 브라우저처럼 사용 가능

### 2. **자동 이벤트 캡처**
- 🖱️ **클릭**: 모든 클릭이 자동으로 기록됨
- ⌨️ **타이핑**: Input/Textarea에 입력한 내용 자동 기록
- 🔄 **페이지 이동**: 다른 페이지로 이동해도 계속 기록

### 3. **스마트 셀렉터 생성**
- 클릭/타이핑한 요소의 최적 셀렉터 자동 생성
- ID, Class, XPath, ARIA Role, Text 등 다중 후보 생성
- 가장 안정적인 셀렉터 우선 순위로 정렬

---

## 🚀 사용 방법

### 1️⃣ 서버 실행

```bash
cd ~/projects/webtest-automation-poc
npm run dev
```

- 백엔드: http://localhost:3001
- 프론트엔드: http://localhost:3002

### 2️⃣ 세션 시작

1. **프론트엔드 접속**: http://localhost:3002
2. **Base URL 입력**: 테스트할 사이트 URL (예: `https://example.com`)
3. **"세션 시작" 클릭**
   - ✨ **실제 Chromium 브라우저 창이 열립니다!**
   - 입력한 URL로 자동 이동

### 3️⃣ 레코딩 시작

1. 프론트엔드에서 **"레코드" 버튼 클릭** (빨간색으로 변함)
2. 브라우저 콘솔에 `🎬 Recording started` 메시지 확인
3. 이제 준비 완료!

### 4️⃣ 실제 브라우저에서 테스트

**열린 Chromium 브라우저 창에서**:

```
👉 버튼 클릭
   → 자동으로 "click" 스텝 기록됨
   → 프론트엔드 테이블에 실시간 표시

👉 Input에 텍스트 입력
   → 자동으로 "type" 스텝 기록됨
   → 입력값까지 함께 저장

👉 링크 클릭 → 다음 페이지 이동
   → "navigate" 스텝 자동 기록
   → 계속 클릭/타이핑 가능
```

### 5️⃣ 스크립트 확인 및 편집

**프론트엔드 (http://localhost:3002) 에서**:

- 우측 테이블에 자동 기록된 스텝 확인
- **Command** 드롭다운으로 명령어 변경 가능
- **Target** 필드에서 셀렉터 직접 수정 가능
- **Value** 필드에서 입력값 수정 가능

### 6️⃣ 레코딩 종료

- 프론트엔드에서 **"레코드" 버튼 다시 클릭** (회색으로 변함)
- 또는 **"세션 종료"** 클릭

---

## 🎬 데모 시나리오

### 예시: 네이버 로그인 테스트

```
1. Base URL: https://naver.com
2. "세션 시작" → Chromium 브라우저 열림
3. "레코드" 활성화

🖱️ 실제 브라우저에서:
   - "로그인" 버튼 클릭
   - ID 입력란 클릭 → "myusername" 타이핑
   - PW 입력란 클릭 → "mypassword" 타이핑
   - "로그인" 버튼 클릭

📋 프론트엔드 테이블에 자동 기록:
   1. click   | #login-button
   2. type    | #id           | myusername
   3. type    | #pw           | mypassword
   4. click   | .btn-login
   5. navigate| https://naver.com/mypage
```

---

## 🔍 작동 원리

### 1. **Browser Injection**
```javascript
// 브라우저에 레코더 스크립트 자동 주입
document.addEventListener('click', (e) => {
  // 클릭 이벤트 캡처
});

document.addEventListener('input', (e) => {
  // 입력 이벤트 캡처
});
```

### 2. **Event Polling**
```
Backend → 1초마다 브라우저에서 이벤트 가져오기
       → 각 이벤트를 TestStep으로 변환
       → WebSocket으로 Frontend에 전송
```

### 3. **Selector Generation**
```
클릭 좌표 (x, y) → document.elementFromPoint()
                 → 요소 정보 추출
                 → 스마트 셀렉터 생성 (ID, Class, XPath...)
                 → 가장 안정적인 것 우선
```

---

## 💡 팁 & 모범 사례

### ✅ DO

- **천천히 작업하기**: 각 액션 사이에 1-2초 대기 (폴링 주기 고려)
- **명확한 클릭**: 요소의 중심을 정확하게 클릭
- **입력 완료 후 대기**: 타이핑 후 0.5초 대기 (debounce)
- **ID가 있는 요소 선호**: 가장 안정적인 셀렉터

### ❌ DON'T

- 너무 빠르게 연속 클릭 (폴링이 놓칠 수 있음)
- 동적으로 생성되는 ID 사용 (`btn-1234567890`)
- 불안정한 Class 사용 (`css-abc123-def456`)

### 🎯 Best Practices

1. **테스트 전 준비**
   - 개발자 도구 (F12) 열어두기
   - Console에서 `__recorder_events` 확인 가능

2. **레코딩 중**
   - 실제 사용자처럼 자연스럽게 조작
   - 각 액션의 완료를 확인하며 진행
   - 백엔드 터미널 로그 실시간 모니터링

3. **레코딩 후**
   - 생성된 셀렉터 검토
   - 필요시 더 안정적인 셀렉터로 수동 변경
   - Command 타입 확인 (click → assert 등)

---

## 🐛 트러블슈팅

### 브라우저 창이 열리지 않음
```bash
# 백엔드 재시작
cd ~/projects/webtest-automation-poc/packages/backend
npm run dev
```

### 클릭이 기록되지 않음
1. **레코드 버튼 확인**: 빨간색인가?
2. **브라우저 콘솔**: `__recorder_active === true` 확인
3. **백엔드 로그**: `🖱️ Click captured` 메시지 확인
4. **폴링 대기**: 최대 1초 소요

### 셀렉터가 생성되지 않음
- 백엔드 로그에 `Generated 0 selector candidates` 확인
- `document.body` 같은 일반 요소는 셀렉터 생성 안 됨
- 더 구체적인 요소 클릭 (버튼, 링크, Input 등)

### Input이 기록되지 않음
- 타이핑 후 **0.5초 대기** (debounce)
- Input/Textarea 요소인지 확인
- 백엔드 로그에 `⌨️ Input captured` 확인

---

## 📊 로그 모니터링

### 백엔드 터미널
```
🎬 Recording started - Browser actions will be captured automatically
✅ Auto-recording enabled - All clicks and inputs will be tracked
📝 Processing event: click { x: 123, y: 456 }
Getting element at location: (x: 123, y: 456)
Found backendNodeId: 12345
Element found: button { id: 'submit' }
Generated 3 selector candidates
✅ Click step recorded
```

### 브라우저 콘솔 (F12)
```javascript
🎯 Recorder script injected - Ready to capture events
🖱️ Click captured: { tagName: 'BUTTON', id: 'submit', x: 123, y: 456 }
⌨️ Input captured: { tagName: 'INPUT', id: 'username', value: 'test' }
```

### 프론트엔드 콘솔
```javascript
WebSocket message received: step:recorded
🔍 Element inspected: { candidatesLength: 3, recording: true }
✅ Recording click step automatically
```

---

## 🎉 다음 단계

레코딩이 완료되면:

1. **스크립트 편집**: Command/Target/Value 수정
2. **스크립트 실행**: "Run" 버튼 클릭 (향후 구현)
3. **스크립트 내보내기**: JSON/YAML 저장 (향후 구현)
4. **CI/CD 통합**: GitHub Actions 등에서 실행 (향후 구현)

---

## 🔗 관련 문서

- [README.md](./README.md) - 프로젝트 개요
- [ARCHITECTURE.md](./ARCHITECTURE.md) - 시스템 아키텍처
- [QUICK_START.md](./QUICK_START.md) - 빠른 시작 가이드

---

**Happy Testing! 🚀**

