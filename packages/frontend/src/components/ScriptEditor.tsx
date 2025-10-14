'use client';

import { useStore } from '@/lib/store';
import { Trash2 } from 'lucide-react';

export function ScriptEditor() {
  const { steps, removeStep, sessionId } = useStore();

  const getStepDisplay = (step: any) => {
    switch (step.type) {
      case 'navigate':
        return `Navigate to ${step.url}`;
      case 'click':
        return `Click: ${step.target?.candidates[0]?.selector || 'unknown'}`;
      case 'type':
        return `Type "${step.value}" into ${step.target?.candidates[0]?.selector || 'unknown'}`;
      case 'waitFor':
        return 'Wait';
      case 'assert':
        return `Assert: ${step.target?.candidates[0]?.selector || 'unknown'} is visible`;
      default:
        return step.type;
    }
  };

  return (
    <div className="h-full flex flex-col bg-card">
      <div className="h-12 border-b border-border px-4 flex items-center">
        <h2 className="font-semibold">스크립트</h2>
        <span className="ml-auto text-sm text-muted-foreground">
          {steps.length} 스텝
        </span>
      </div>

      <div className="flex-1 overflow-auto p-2">
        {!sessionId ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            세션을 시작하세요
          </div>
        ) : steps.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            레코드를 시작하거나 수동으로 스텝을 추가하세요
          </div>
        ) : (
          <div className="space-y-1">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className="group flex items-start gap-2 p-3 rounded-lg border border-border bg-background hover:bg-accent/50 transition-colors"
              >
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium mb-1">
                    {step.type.toUpperCase()}
                  </div>
                  <div className="text-xs text-muted-foreground break-all">
                    {getStepDisplay(step)}
                  </div>
                </div>
                <button
                  onClick={() => removeStep(step.id)}
                  className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-opacity"
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Command Palette */}
      {sessionId && (
        <div className="border-t border-border p-3">
          <div className="text-xs font-semibold text-muted-foreground mb-2">
            💡 레코딩을 켜고 페이지에서 요소를 클릭하세요
          </div>
          <div className="text-xs text-muted-foreground mb-2">
            또는 수동으로 스텝 추가:
          </div>
          <div className="flex gap-2">
            <button
              className="flex-1 px-3 py-1.5 text-xs bg-secondary hover:bg-secondary/80 rounded"
              onClick={() => {
                const url = prompt('이동할 URL:');
                if (url) {
                  const step = { type: 'navigate', url } as any;
                  removeStep; // To use the function
                }
              }}
              title="Navigate 스텝 추가"
            >
              🔗 Navigate
            </button>
            <button
              className="flex-1 px-3 py-1.5 text-xs bg-secondary hover:bg-secondary/80 rounded"
              onClick={() => {
                const selector = prompt('셀렉터:');
                const value = prompt('입력할 텍스트:');
                if (selector && value) {
                  // Manual type step - simplified
                  console.log('Type step:', selector, value);
                }
              }}
              title="Type 스텝 추가"
            >
              ⌨️ Type
            </button>
            <button
              className="flex-1 px-3 py-1.5 text-xs bg-secondary hover:bg-secondary/80 rounded"
              onClick={() => {
                const ms = prompt('대기 시간 (ms):', '1000');
                if (ms) {
                  console.log('Wait step:', ms);
                }
              }}
              title="Wait 스텝 추가"
            >
              ⏱️ Wait
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

