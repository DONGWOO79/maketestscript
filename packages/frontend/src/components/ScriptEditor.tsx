'use client';

import { useStore } from '@/lib/store';
import { Trash2 } from 'lucide-react';

export function ScriptEditor() {
  const { steps, removeStep, updateStep, sessionId } = useStore();

  const handleCommandChange = (stepId: string, newType: string) => {
    updateStep(stepId, { type: newType as any });
  };

  const handleTargetChange = (stepId: string, value: string) => {
    const step = steps.find(s => s.id === stepId);
    if (!step) return;
    
    // Update target selector
    if (step.target) {
      updateStep(stepId, {
        target: {
          ...step.target,
          candidates: [
            { ...step.target.candidates[0], selector: value }
          ]
        }
      });
    } else {
      // For navigate command, update URL
      updateStep(stepId, { url: value });
    }
  };

  const handleValueChange = (stepId: string, value: string) => {
    updateStep(stepId, { value });
  };

  const getTarget = (step: any): string => {
    if (step.url) return step.url;
    if (step.target?.candidates?.[0]) {
      return step.target.candidates[0].selector;
    }
    return '';
  };

  const getValue = (step: any): string => {
    return step.value || '';
  };

  return (
    <div className="h-full flex flex-col bg-card">
      <div className="h-12 border-b border-border px-4 flex items-center justify-between">
        <h2 className="font-semibold">Test Script</h2>
        <span className="text-sm text-muted-foreground">
          {steps.length} steps
        </span>
      </div>

      <div className="flex-1 overflow-auto">
        {!sessionId ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            세션을 시작하세요
          </div>
        ) : steps.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            레코드를 시작하거나 수동으로 스텝을 추가하세요
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted border-b border-border">
              <tr>
                <th className="w-8 p-2 text-left font-medium">#</th>
                <th className="w-24 p-2 text-left font-medium">Command</th>
                <th className="p-2 text-left font-medium">Target</th>
                <th className="w-32 p-2 text-left font-medium">Value</th>
                <th className="w-8 p-2"></th>
              </tr>
            </thead>
            <tbody>
              {steps.map((step, index) => (
                <tr
                  key={step.id}
                  className="group border-b border-border hover:bg-accent/30 transition-colors"
                >
                  {/* Index */}
                  <td className="p-2 text-muted-foreground text-center">
                    {index + 1}
                  </td>

                  {/* Command */}
                  <td className="p-2">
                    <select
                      value={step.type}
                      onChange={(e) => handleCommandChange(step.id, e.target.value)}
                      className="w-full px-2 py-1 text-sm bg-background border border-input rounded hover:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="open">open</option>
                      <option value="click">click</option>
                      <option value="type">type</option>
                      <option value="waitFor">waitFor</option>
                      <option value="assert">assert</option>
                      <option value="navigate">navigate</option>
                    </select>
                  </td>

                  {/* Target */}
                  <td className="p-2">
                    <input
                      type="text"
                      value={getTarget(step)}
                      onChange={(e) => handleTargetChange(step.id, e.target.value)}
                      placeholder="Selector or URL"
                      className="w-full px-2 py-1 text-sm bg-background border border-input rounded hover:border-primary focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                    />
                  </td>

                  {/* Value */}
                  <td className="p-2">
                    <input
                      type="text"
                      value={getValue(step)}
                      onChange={(e) => handleValueChange(step.id, e.target.value)}
                      placeholder="Value"
                      className="w-full px-2 py-1 text-sm bg-background border border-input rounded hover:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </td>

                  {/* Actions */}
                  <td className="p-2">
                    <button
                      onClick={() => removeStep(step.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-opacity"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      {sessionId && (
        <div className="border-t border-border p-3 bg-muted/30">
          <div className="text-xs text-muted-foreground text-center">
            💡 <strong>레코딩 모드</strong>: 페이지에서 클릭 → 자동으로 스텝 추가 → Command 선택하여 편집
          </div>
        </div>
      )}
    </div>
  );
}

