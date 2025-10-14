'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { Copy, Check } from 'lucide-react';

export function InspectorPanel() {
  const { inspectedElement } = useStore();
  const [activeTab, setActiveTab] = useState<'element' | 'selectors' | 'console'>('element');
  const [copiedSelector, setCopiedSelector] = useState<string | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSelector(text);
    setTimeout(() => setCopiedSelector(null), 2000);
  };

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Tabs */}
      <div className="h-10 border-b border-border px-4 flex items-center gap-4">
        <button
          onClick={() => setActiveTab('element')}
          className={`text-sm font-medium pb-2 border-b-2 transition-colors ${
            activeTab === 'element'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Element
        </button>
        <button
          onClick={() => setActiveTab('selectors')}
          className={`text-sm font-medium pb-2 border-b-2 transition-colors ${
            activeTab === 'selectors'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Selectors
        </button>
        <button
          onClick={() => setActiveTab('console')}
          className={`text-sm font-medium pb-2 border-b-2 transition-colors ${
            activeTab === 'console'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Console
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {!inspectedElement ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            페이지에서 요소를 클릭하여 검사하세요
          </div>
        ) : (
          <>
            {activeTab === 'element' && (
              <div className="space-y-4">
                <div>
                  <div className="text-xs font-semibold text-muted-foreground mb-2">
                    TAG NAME
                  </div>
                  <div className="text-sm font-mono bg-muted/50 px-3 py-2 rounded">
                    {inspectedElement.element.tagName}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-muted-foreground mb-2">
                    TEXT CONTENT
                  </div>
                  <div className="text-sm bg-muted/50 px-3 py-2 rounded max-h-20 overflow-auto">
                    {inspectedElement.element.textContent || '(empty)'}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-muted-foreground mb-2">
                    ATTRIBUTES
                  </div>
                  <div className="text-sm font-mono bg-muted/50 px-3 py-2 rounded max-h-32 overflow-auto space-y-1">
                    {Object.entries(inspectedElement.element.attributes).map(([key, value]) => (
                      <div key={key}>
                        <span className="text-primary">{key}</span>=
                        <span className="text-green-600">"{value}"</span>
                      </div>
                    ))}
                  </div>
                </div>

                {inspectedElement.element.boundingBox && (
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground mb-2">
                      BOUNDING BOX
                    </div>
                    <div className="text-sm font-mono bg-muted/50 px-3 py-2 rounded">
                      {`x: ${Math.round(inspectedElement.element.boundingBox.x)}, y: ${Math.round(
                        inspectedElement.element.boundingBox.y
                      )}, w: ${Math.round(inspectedElement.element.boundingBox.width)}, h: ${Math.round(
                        inspectedElement.element.boundingBox.height
                      )}`}
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-xs font-semibold text-muted-foreground mb-2">
                    OUTER HTML (truncated)
                  </div>
                  <div className="text-xs font-mono bg-muted/50 px-3 py-2 rounded max-h-40 overflow-auto whitespace-pre-wrap break-all">
                    {inspectedElement.element.outerHTML}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'selectors' && (
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground mb-4">
                  셀렉터 후보 (점수 순)
                </div>
                {inspectedElement.candidates.map((candidate, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-lg border border-border bg-background hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded bg-primary/10 text-primary">
                          {candidate.type}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Score: {candidate.score}
                        </span>
                        <span
                          className={`text-xs ${
                            candidate.uniqueness === 1
                              ? 'text-green-600'
                              : 'text-orange-600'
                          }`}
                        >
                          {candidate.uniqueness === 1
                            ? '✓ Unique'
                            : `${candidate.uniqueness} matches`}
                        </span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(candidate.selector)}
                        className="p-1 hover:bg-muted rounded"
                        title="Copy selector"
                      >
                        {copiedSelector === candidate.selector ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <code className="text-sm font-mono break-all">
                      {candidate.selector}
                    </code>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'console' && (
              <div className="text-sm text-muted-foreground">
                Console output will appear here...
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

