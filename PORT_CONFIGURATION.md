# 포트 설정 안내

## 🔌 사용 포트

| 서비스 | 포트 | URL |
|--------|------|-----|
| **Frontend** (Next.js) | **3002** | http://localhost:3002 |
| **Backend** (Fastify) | **3001** | http://localhost:3001 |
| WebSocket | 3001 | ws://localhost:3001/ws |

## ⚠️ 포트 3000을 피하는 이유

**qa-test-manager**가 이미 포트 3000을 사용 중이므로 충돌을 방지하기 위해 **포트 3002**를 사용합니다.

## 🔧 포트 변경 방법

### Frontend 포트 변경

**파일**: `packages/frontend/package.json`

```json
{
  "scripts": {
    "dev": "next dev -p 3002",  // ← 원하는 포트로 변경
    "start": "next start -p 3002"
  }
}
```

### Backend 포트 변경

**파일**: `packages/backend/.env` (없으면 생성)

```env
PORT=3001  # ← 원하는 포트로 변경
FRONTEND_URL=http://localhost:3002  # Frontend 포트와 일치시켜야 함
```

### WebSocket URL 변경

**파일**: `packages/frontend/.env.local` (없으면 생성)

```env
NEXT_PUBLIC_WS_URL=ws://localhost:3001/ws  # Backend 포트와 일치
```

## 🚨 포트 충돌 해결

### 포트가 이미 사용 중인 경우

```bash
# 포트 사용 확인 (macOS/Linux)
lsof -i :3002  # Frontend
lsof -i :3001  # Backend

# 프로세스 종료
kill -9 <PID>

# Windows
netstat -ano | findstr :3002
taskkill /PID <PID> /F
```

### 다른 포트로 임시 실행

```bash
# Frontend를 3003 포트로 실행
cd packages/frontend
PORT=3003 npm run dev

# Backend를 3004 포트로 실행
cd packages/backend
PORT=3004 npm run dev
```

## ✅ 설정 확인

실행 후 다음 URL에 접속하여 정상 작동 확인:

1. **Frontend**: http://localhost:3002
2. **Backend Health Check**: http://localhost:3001/health

예상 응답:
```json
{
  "status": "ok",
  "timestamp": 1234567890123
}
```

## 📝 환경 변수 파일 생성

처음 실행 시 `.env` 파일을 생성하세요:

```bash
# Backend
cp packages/backend/.env.example packages/backend/.env

# Frontend
cp packages/frontend/.env.local.example packages/frontend/.env.local
```

기본값으로 설정되어 있으므로 수정 없이 바로 사용 가능합니다.

