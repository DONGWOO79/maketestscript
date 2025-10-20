'use client';

import { useStore } from '@/lib/store';
import { Trash2, Plus, Clock, Navigation, CheckCircle, MessageSquare } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';

export function ScriptEditor() {
  const { steps, removeStep, updateStep, insertStep, sessionId } = useStore();
  const [showInsertMenu, setShowInsertMenu] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowInsertMenu(null);
      }
    };

    if (showInsertMenu !== null) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showInsertMenu]);

  const handleCommandChange = (stepId: string, newType: string) => {
    updateStep(stepId, { type: newType as any });
  };

  const handleTargetChange = (stepId: string, value: string) => {
    const step = steps.find(s => s.id === stepId);
    if (!step) return;
    
    // For comment command, update value field
    if (step.type === 'comment') {
      updateStep(stepId, { value });
      return;
    }
    
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
    if (step.type === 'comment') {
      return step.value || '';
    }
    if (step.url) return step.url;
    if (step.target?.candidates?.[0]) {
      return step.target.candidates[0].selector;
    }
    return '';
  };

  const getValue = (step: any): string => {
    if (step.type === 'comment') return '';
    return step.value || '';
  };

  const handleInsertCommand = (afterIndex: number, commandType: string) => {
    const newStep: any = {
      id: uuidv4(),
      timestamp: Date.now(),
    };

    switch (commandType) {
      case 'wait':
        newStep.type = 'waitFor';
        newStep.value = '2000'; // 2 seconds default
        newStep.target = { candidates: [{ selector: '', type: 'css' }] };
        break;
      case 'navigate':
        newStep.type = 'navigate';
        newStep.url = 'https://';
        break;
      case 'assert':
        newStep.type = 'assert';
        newStep.target = { candidates: [{ selector: '', type: 'css' }] };
        newStep.value = '';
        break;
      case 'comment':
        newStep.type = 'comment';
        newStep.value = '// Comment here';
        break;
    }

    insertStep(newStep, afterIndex);
    setShowInsertMenu(null);
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
                <>
                  {/* Step Row */}
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
                        <option value="comment">comment</option>
                      </select>
                    </td>

                    {/* Target */}
                    <td className="p-2">
                      <input
                        type="text"
                        value={getTarget(step)}
                        onChange={(e) => handleTargetChange(step.id, e.target.value)}
                        placeholder={step.type === 'comment' ? 'Comment text' : 'Selector or URL'}
                        className="w-full px-2 py-1 text-sm bg-background border border-input rounded hover:border-primary focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                      />
                    </td>

                    {/* Value */}
                    <td className="p-2">
                      <input
                        type="text"
                        value={getValue(step)}
                        onChange={(e) => handleValueChange(step.id, e.target.value)}
                        placeholder={step.type === 'waitFor' ? 'ms (e.g. 2000)' : 'Value'}
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

                  {/* Insert Button Row */}
                  <tr className="insert-row group/insert">
                    <td colSpan={5} className="p-0 relative">
                      <div ref={showInsertMenu === index ? menuRef : null} className="h-2 group-hover/insert:h-8 transition-all flex items-center justify-center relative">
                        <button
                          onClick={() => setShowInsertMenu(showInsertMenu === index ? null : index)}
                          className="opacity-0 group-hover/insert:opacity-100 absolute bg-primary hover:bg-primary/90 text-primary-foreground rounded-full p-1 shadow-lg transition-all z-10"
                          title="Insert step"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        
                        {/* Insert Menu */}
                        {showInsertMenu === index && (
                          <div className="absolute left-1/2 transform -translate-x-1/2 mt-10 bg-card border border-border rounded-lg shadow-xl z-50 min-w-[200px]">
                            <div className="p-1">
                              <button
                                onClick={() => handleInsertCommand(index, 'wait')}
                                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-accent rounded text-sm text-left"
                              >
                                <Clock className="w-4 h-4 text-blue-500" />
                                <div>
                                  <div className="font-medium">Wait</div>
                                  <div className="text-xs text-muted-foreground">대기 시간 추가</div>
                                </div>
                              </button>
                              <button
                                onClick={() => handleInsertCommand(index, 'navigate')}
                                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-accent rounded text-sm text-left"
                              >
                                <Navigation className="w-4 h-4 text-green-500" />
                                <div>
                                  <div className="font-medium">Navigate</div>
                                  <div className="text-xs text-muted-foreground">URL 이동</div>
                                </div>
                              </button>
                              <button
                                onClick={() => handleInsertCommand(index, 'assert')}
                                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-accent rounded text-sm text-left"
                              >
                                <CheckCircle className="w-4 h-4 text-orange-500" />
                                <div>
                                  <div className="font-medium">Assert</div>
                                  <div className="text-xs text-muted-foreground">검증 추가</div>
                                </div>
                              </button>
                              <button
                                onClick={() => handleInsertCommand(index, 'comment')}
                                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-accent rounded text-sm text-left"
                              >
                                <MessageSquare className="w-4 h-4 text-gray-500" />
                                <div>
                                  <div className="font-medium">Comment</div>
                                  <div className="text-xs text-muted-foreground">주석 추가</div>
                                </div>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                </>
              ))}
              
              {/* Insert at end button */}
              {steps.length > 0 && (
                <tr className="insert-row group/insert">
                  <td colSpan={5} className="p-0 relative">
                    <div ref={showInsertMenu === steps.length ? menuRef : null} className="h-2 group-hover/insert:h-8 transition-all flex items-center justify-center relative">
                      <button
                        onClick={() => setShowInsertMenu(showInsertMenu === steps.length ? null : steps.length)}
                        className="opacity-0 group-hover/insert:opacity-100 absolute bg-primary hover:bg-primary/90 text-primary-foreground rounded-full p-1 shadow-lg transition-all z-10"
                        title="Insert step at end"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      
                      {/* Insert Menu */}
                      {showInsertMenu === steps.length && (
                        <div className="absolute left-1/2 transform -translate-x-1/2 mt-10 bg-card border border-border rounded-lg shadow-xl z-50 min-w-[200px]">
                          <div className="p-1">
                            <button
                              onClick={() => handleInsertCommand(steps.length - 1, 'wait')}
                              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-accent rounded text-sm text-left"
                            >
                              <Clock className="w-4 h-4 text-blue-500" />
                              <div>
                                <div className="font-medium">Wait</div>
                                <div className="text-xs text-muted-foreground">대기 시간 추가</div>
                              </div>
                            </button>
                            <button
                              onClick={() => handleInsertCommand(steps.length - 1, 'navigate')}
                              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-accent rounded text-sm text-left"
                            >
                              <Navigation className="w-4 h-4 text-green-500" />
                              <div>
                                <div className="font-medium">Navigate</div>
                                <div className="text-xs text-muted-foreground">URL 이동</div>
                              </div>
                            </button>
                            <button
                              onClick={() => handleInsertCommand(steps.length - 1, 'assert')}
                              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-accent rounded text-sm text-left"
                            >
                              <CheckCircle className="w-4 h-4 text-orange-500" />
                              <div>
                                <div className="font-medium">Assert</div>
                                <div className="text-xs text-muted-foreground">검증 추가</div>
                              </div>
                            </button>
                            <button
                              onClick={() => handleInsertCommand(steps.length - 1, 'comment')}
                              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-accent rounded text-sm text-left"
                            >
                              <MessageSquare className="w-4 h-4 text-gray-500" />
                              <div>
                                <div className="font-medium">Comment</div>
                                <div className="text-xs text-muted-foreground">주석 추가</div>
                              </div>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )}
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

