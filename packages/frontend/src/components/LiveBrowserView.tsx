'use client';

import { useStore } from '@/lib/store';
import { RefreshCw } from 'lucide-react';

export function LiveBrowserView() {
  const { sessionId, currentUrl, screenshot, recording, inspectElement, requestScreenshot } = useStore();

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!sessionId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Scale coordinates to actual page size (1280x720)
    const scaleX = 1280 / rect.width;
    const scaleY = 720 / rect.height;
    const actualX = x * scaleX;
    const actualY = y * scaleY;

    // Always inspect element to show in Inspector panel
    inspectElement(actualX, actualY, recording);
  };

  if (!sessionId) {
    return (
      <div className="h-full flex items-center justify-center bg-muted/20">
        <div className="text-center">
          <p className="text-muted-foreground mb-2">세션이 시작되지 않았습니다</p>
          <p className="text-sm text-muted-foreground">
            상단에서 Base URL을 입력하고 "세션 시작"을 클릭하세요
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-muted/20">
      {/* Address Bar */}
      <div className="h-12 border-b border-border bg-card px-4 flex items-center gap-2">
        <button
          onClick={() => requestScreenshot()}
          className="p-1.5 hover:bg-accent rounded"
          title="새로고침"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
        <div className="flex-1 px-3 py-1.5 text-sm bg-background border border-input rounded-md">
          {currentUrl || 'Loading...'}
        </div>
      </div>

      {/* Browser Viewport */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
        {screenshot ? (
          <div
            className="relative cursor-crosshair border border-border shadow-lg"
            onClick={handleClick}
            style={{ maxWidth: '100%', maxHeight: '100%' }}
          >
            <img
              src={screenshot}
              alt="Live page screenshot"
              className="block w-full h-auto"
              onError={(e) => {
                console.error('Image load error:', e);
                console.log('Screenshot data length:', screenshot.length);
                console.log('Screenshot preview:', screenshot.substring(0, 100));
              }}
              onLoad={() => {
                console.log('Image loaded successfully');
              }}
            />
            {recording && (
              <div className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-2 animate-pulse">
                <span className="w-2 h-2 bg-white rounded-full"></span>
                레코딩 중
              </div>
            )}
          </div>
        ) : (
          <div className="text-muted-foreground">스크린샷 로딩 중...</div>
        )}
      </div>
    </div>
  );
}

