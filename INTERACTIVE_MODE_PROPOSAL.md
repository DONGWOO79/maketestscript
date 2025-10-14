# 실제 페이지 상호작용 모드 제안

## 현재 한계

**현재 아키텍처**: 백엔드 헤드리스 브라우저 → 스크린샷 → 프론트엔드 표시
- ❌ 실제 페이지와 직접 상호작용 불가
- ❌ 스크린샷이므로 폼 입력, 스크롤, 호버 등 제한적
- ❌ 실시간 DOM 변경 확인 어려움

## 해결 방안

### 옵션 1: VNC/noVNC 스트리밍 (권장 - 단기)
**장점**:
- ✅ 백엔드 아키텍처 유지
- ✅ 마우스/키보드 이벤트 실시간 전달
- ✅ 실제 브라우저 화면 스트리밍

**구현**:
```typescript
// Backend: VNC 서버 연결
import RFB from '@novnc/novnc';

// Frontend: noVNC 클라이언트
<canvas id="noVNC_canvas"></canvas>
```

**단점**: 추가 인프라(VNC 서버) 필요

---

### 옵션 2: Chrome DevTools Protocol 원격 디버깅 (권장 - 중기)
**장점**:
- ✅ CDP의 `Page.navigate`, `Input.dispatchMouseEvent` 활용
- ✅ 실시간 DOM 업데이트
- ✅ Playwright 기반 유지

**구현**:
```typescript
// Backend: CDP 이벤트 포워딩
cdpSession.on('Page.frameNavigated', (frame) => {
  ws.send({ type: 'dom:updated', frame });
});

// Frontend: 캔버스에 렌더링 + 이벤트 전송
canvas.addEventListener('click', (e) => {
  ws.send({ type: 'input:click', x, y });
});
```

**단점**: 복잡한 이벤트 매핑 필요

---

### 옵션 3: 브라우저 확장 모드 (장기)
**장점**:
- ✅ 사용자가 실제 탭에서 직접 작업
- ✅ 모든 DOM 이벤트 네이티브 처리
- ✅ 크로스 오리진 제약 없음

**구현**:
```
Chrome Extension → Content Script → 페이지 이벤트 캡처 → WebSocket → 백엔드
```

**단점**: 확장 개발/배포 필요, 브라우저별 구현

---

## 현재 MVP 개선안 (즉시 적용 가능)

### 1. 스크린샷 주기 단축
```typescript
// 현재: 클릭/액션 시에만
// 개선: 500ms마다 자동 갱신
setInterval(() => requestScreenshot(), 500);
```

### 2. 클릭 피드백 개선
```typescript
// 클릭 위치에 시각적 마커 표시
<div className="click-marker" style={{ left: x, top: y }} />
```

### 3. 키보드 입력 지원 추가
```typescript
// Type 명령 UI 추가
<button onClick={() => addTypeStep()}>텍스트 입력 추가</button>
```

---

## 단계별 로드맵

### M2 (즉시)
- [x] 자동 레코딩 (클릭 → 스텝)
- [ ] 타이핑 이벤트 수동 추가
- [ ] 스크린샷 자동 갱신

### M3 (2주)
- [ ] CDP Input 이벤트 전송
- [ ] 키보드/폼 입력 지원
- [ ] 스크롤 캡처

### M4 (4주)
- [ ] VNC/noVNC 통합
- [ ] 실시간 화면 스트리밍

### M5+ (장기)
- [ ] 브라우저 확장 모드
- [ ] 멀티 탭 지원

---

## 현재 할 수 있는 것

✅ **실제 브라우저**에서 실행됩니다 (헤드리스 Chromium)
✅ **실제 클릭**이 발생합니다 (CDP로 전송)
✅ **실제 페이지 상태**를 캡처합니다

**제한사항**: 
- 사용자가 직접 타이핑/스크롤은 불가
- 스크린샷 기반 피드백 (약간의 지연)

---

## 결론

**단기 해결책**: 
1. 자동 레코딩 개선 (완료)
2. 수동 타이핑 스텝 추가 UI
3. 스크린샷 자동 갱신

**중장기 목표**:
- CDP 원격 입력 또는 VNC 스트리밍으로 실시간 상호작용

현재 MVP는 **"관찰 → 편집 → 실행"** 워크플로우에 최적화되어 있습니다.

