'use client';

import { useEffect } from 'react';
import { useStore } from '@/lib/store';
import { Header } from './Header';
import { LiveBrowserView } from './LiveBrowserView';
import { ScriptEditor } from './ScriptEditor';
import { InspectorPanel } from './InspectorPanel';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

export function TestAutomationUI() {
  const { connect, disconnect } = useStore();

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return (
    <div className="flex flex-col h-full bg-background">
      <Header />
      
      <PanelGroup direction="vertical" className="flex-1">
        {/* Top: Browser and Script Editor */}
        <Panel defaultSize={70} minSize={30}>
          <PanelGroup direction="horizontal">
            {/* Left: Live Browser View */}
            <Panel defaultSize={60} minSize={30}>
              <LiveBrowserView />
            </Panel>

            {/* Resize Handle - Vertical */}
            <PanelResizeHandle className="w-1.5 bg-border hover:bg-primary transition-colors cursor-col-resize relative group">
              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-1 bg-border group-hover:bg-primary transition-colors" />
            </PanelResizeHandle>

            {/* Right: Script Editor */}
            <Panel defaultSize={40} minSize={20}>
              <ScriptEditor />
            </Panel>
          </PanelGroup>
        </Panel>

        {/* Resize Handle - Horizontal */}
        <PanelResizeHandle className="h-1.5 bg-border hover:bg-primary transition-colors cursor-row-resize relative group">
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 bg-border group-hover:bg-primary transition-colors" />
        </PanelResizeHandle>

        {/* Bottom: Inspector Panel */}
        <Panel defaultSize={30} minSize={15}>
          <InspectorPanel />
        </Panel>
      </PanelGroup>
    </div>
  );
}

