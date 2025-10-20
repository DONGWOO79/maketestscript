'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { Play, Circle, Square, Save, Download, Upload, FileText } from 'lucide-react';

export function Header() {
  const {
    connected,
    sessionId,
    baseUrl,
    recording,
    running,
    isDirty,
    scriptName,
    steps,
    setBaseUrl,
    startSession,
    closeSession,
    toggleRecording,
    runScript,
    saveScript,
    downloadScript,
    loadScript,
  } = useStore();

  const [urlInput, setUrlInput] = useState('https://example.com');

  const handleStartSession = () => {
    if (urlInput) {
      let url = urlInput.trim();
      // Auto-add https:// if protocol is missing
      if (url && !url.match(/^https?:\/\//i)) {
        url = `https://${url}`;
        setUrlInput(url);
      }
      setBaseUrl(url);
      startSession(url);
    }
  };

  const handleCloseSession = () => {
    if (isDirty && !confirm('저장하지 않은 변경사항이 있습니다. 정말 종료하시겠습니까?')) {
      return;
    }
    closeSession();
  };

  const handleUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target?.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target?.result as string);
            loadScript(data);
          } catch (error) {
            alert('파일을 불러오는데 실패했습니다.');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  // Warn before leaving page with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty && steps.length > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, steps.length]);

  return (
    <header className="h-14 border-b border-border bg-card px-4 flex items-center gap-4">
      <div className="font-semibold text-lg flex items-center gap-2">
        <FileText className="w-5 h-5" />
        <span>
          {scriptName}
          {isDirty && <span className="text-destructive">*</span>}
        </span>
      </div>

      <div className="flex-1 flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Base URL:</span>
        <input
          type="text"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder="https://example.com"
          disabled={!!sessionId}
          className="flex-1 max-w-md px-3 py-1.5 text-sm border border-input rounded-md bg-background disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-ring"
        />

        {!sessionId ? (
          <button
            onClick={handleStartSession}
            disabled={!connected || !urlInput}
            className="px-4 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            세션 시작
          </button>
        ) : (
          <button
            onClick={handleCloseSession}
            className="px-4 py-1.5 text-sm font-medium bg-destructive text-destructive-foreground rounded-md hover:opacity-90"
          >
            세션 종료
          </button>
        )}
      </div>

      {sessionId && (
        <>
          <button
            onClick={toggleRecording}
            disabled={running}
            className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              recording
                ? 'bg-destructive text-destructive-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {recording ? (
              <>
                <Square className="w-4 h-4" />
                중지
              </>
            ) : (
              <>
                <Circle className="w-4 h-4" />
                레코드
              </>
            )}
          </button>

          <button
            onClick={runScript}
            disabled={running || recording || steps.length === 0}
            className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-4 h-4" />
            실행
          </button>

          <div className="h-6 w-px bg-border" />

          <button
            onClick={() => saveScript()}
            disabled={!isDirty || steps.length === 0}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed"
            title="로컬 스토리지에 저장"
          >
            <Save className="w-4 h-4" />
            저장
          </button>

          <button
            onClick={downloadScript}
            disabled={steps.length === 0}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed"
            title="JSON 파일로 다운로드"
          >
            <Download className="w-4 h-4" />
            다운로드
          </button>

          <button
            onClick={handleUpload}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80"
            title="JSON 파일 불러오기"
          >
            <Upload className="w-4 h-4" />
            불러오기
          </button>
        </>
      )}

      <div className="flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full ${
            connected ? 'bg-green-500' : 'bg-red-500'
          }`}
        />
        <span className="text-xs text-muted-foreground">
          {connected ? '연결됨' : '연결 안 됨'}
        </span>
      </div>
    </header>
  );
}

