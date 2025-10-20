import { create } from 'zustand';

export interface TestStep {
  id: string;
  type: 'navigate' | 'click' | 'type' | 'waitFor' | 'assert';
  timestamp: number;
  target?: SelectorInfo;
  value?: string;
  url?: string;
}

export interface SelectorInfo {
  candidates: SelectorCandidate[];
  element: {
    tagName: string;
    outerHTML: string;
    attributes: Record<string, string>;
    boundingBox: { x: number; y: number; width: number; height: number } | null;
    textContent: string;
  };
}

export interface SelectorCandidate {
  selector: string;
  type: 'testid' | 'role' | 'text' | 'css' | 'xpath';
  score: number;
  uniqueness: number;
}

interface AppState {
  // Connection
  ws: WebSocket | null;
  connected: boolean;
  
  // Session
  sessionId: string | null;
  baseUrl: string;
  currentUrl: string;
  screenshot: string | null;
  
  // Recording
  recording: boolean;
  steps: TestStep[];
  
  // Inspector
  inspectedElement: SelectorInfo | null;
  
  // Execution
  running: boolean;
  currentStepIndex: number;
  
  // Save state
  isDirty: boolean;
  lastSaved: number | null;
  scriptName: string;
  
  // Actions
  setBaseUrl: (url: string) => void;
  connect: () => void;
  disconnect: () => void;
  startSession: (baseUrl: string) => void;
  closeSession: () => void;
  toggleRecording: () => void;
  addStep: (step: TestStep) => void;
  updateStep: (id: string, updates: Partial<TestStep>) => void;
  removeStep: (id: string) => void;
  inspectElement: (x: number, y: number, autoRecord?: boolean) => void;
  runScript: () => void;
  navigateToUrl: (url: string) => void;
  requestScreenshot: () => void;
  
  // Save/Load actions
  saveScript: (name?: string) => void;
  loadScript: (data: any) => void;
  downloadScript: (format?: 'json' | 'html' | 'playwright') => void;
  autoSave: () => void;
  clearScript: () => void;
  setScriptName: (name: string) => void;
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001/ws';

// Note: Frontend runs on port 3002 to avoid conflict with qa-test-manager (port 3000)

const STORAGE_KEY = 'webtest-autosave';

// Helper: Generate HTML Report
function generateHTMLReport(name: string, baseUrl: string, steps: any[], timestamp: number): string {
  const date = new Date(timestamp).toLocaleString();
  
  const stepsHtml = steps.map((step, index) => {
    const target = step.target?.candidates?.[0]?.selector || step.url || '-';
    const value = step.value || '-';
    return `
      <tr>
        <td>${index + 1}</td>
        <td><strong>${step.type.toUpperCase()}</strong></td>
        <td><code>${target}</code></td>
        <td>${value}</td>
      </tr>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name} - Test Script Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 40px 20px;
      background: #f5f5f5;
    }
    .container {
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      padding: 40px;
    }
    h1 {
      color: #2563eb;
      margin-bottom: 8px;
      font-size: 32px;
    }
    .meta {
      color: #666;
      font-size: 14px;
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 2px solid #e5e7eb;
    }
    .meta-item {
      display: inline-block;
      margin-right: 24px;
      margin-top: 8px;
    }
    .meta-label {
      font-weight: 600;
      color: #374151;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 24px;
    }
    thead {
      background: #f3f4f6;
    }
    th {
      text-align: left;
      padding: 12px 16px;
      font-weight: 600;
      color: #374151;
      border-bottom: 2px solid #e5e7eb;
    }
    td {
      padding: 12px 16px;
      border-bottom: 1px solid #e5e7eb;
    }
    tr:hover {
      background: #f9fafb;
    }
    code {
      background: #f3f4f6;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 13px;
      color: #dc2626;
    }
    strong {
      color: #2563eb;
    }
    .footer {
      margin-top: 40px;
      padding-top: 24px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #9ca3af;
      font-size: 13px;
    }
    @media print {
      body { background: white; padding: 0; }
      .container { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📋 ${name}</h1>
    <div class="meta">
      <div class="meta-item">
        <span class="meta-label">Base URL:</span> 
        <code>${baseUrl || 'Not specified'}</code>
      </div>
      <div class="meta-item">
        <span class="meta-label">Created:</span> ${date}
      </div>
      <div class="meta-item">
        <span class="meta-label">Total Steps:</span> ${steps.length}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 50px;">#</th>
          <th style="width: 120px;">Command</th>
          <th>Target</th>
          <th style="width: 200px;">Value</th>
        </tr>
      </thead>
      <tbody>
        ${stepsHtml}
      </tbody>
    </table>

    <div class="footer">
      Generated by WebTest Automation Tool
    </div>
  </div>
</body>
</html>`;
}

// Helper: Generate Playwright Code
function generatePlaywrightCode(name: string, baseUrl: string, steps: any[]): string {
  const testName = name.replace(/[^a-zA-Z0-9]/g, '_');
  
  const stepsCode = steps.map(step => {
    const indent = '  ';
    switch (step.type) {
      case 'navigate':
        return `${indent}await page.goto('${step.url}');`;
      case 'click':
        const clickSelector = step.target?.candidates?.[0]?.selector || 'body';
        return `${indent}await page.locator('${clickSelector}').click();`;
      case 'type':
        const typeSelector = step.target?.candidates?.[0]?.selector || 'input';
        return `${indent}await page.locator('${typeSelector}').fill('${step.value || ''}');`;
      case 'waitFor':
        const waitSelector = step.target?.candidates?.[0]?.selector || 'body';
        return `${indent}await page.locator('${waitSelector}').waitFor({ state: 'visible' });`;
      case 'assert':
        const assertSelector = step.target?.candidates?.[0]?.selector || 'body';
        return `${indent}await expect(page.locator('${assertSelector}')).toBeVisible();`;
      default:
        return `${indent}// Unknown step type: ${step.type}`;
    }
  }).join('\n');

  return `import { test, expect } from '@playwright/test';

/**
 * ${name}
 * Generated: ${new Date().toLocaleString()}
 * Base URL: ${baseUrl || 'Not specified'}
 */

test.describe('${name}', () => {
  test('${testName}', async ({ page }) => {
    // Navigate to base URL
    await page.goto('${baseUrl}');

    // Execute test steps
${stepsCode}

    // Test completed
    console.log('✅ Test completed successfully');
  });
});
`;
}

export const useStore = create<AppState>((set, get) => ({
  // Initial state
  ws: null,
  connected: false,
  sessionId: null,
  baseUrl: '',
  currentUrl: '',
  screenshot: null,
  recording: false,
  steps: [],
  inspectedElement: null,
  running: false,
  currentStepIndex: -1,
  isDirty: false,
  lastSaved: null,
  scriptName: 'Untitled Script',

  // Actions
  setBaseUrl: (url) => set({ baseUrl: url }),

  connect: () => {
    const { ws: existingWs, connected } = get();
    
    // Prevent duplicate connections
    if (existingWs && (existingWs.readyState === WebSocket.CONNECTING || existingWs.readyState === WebSocket.OPEN)) {
      console.log('WebSocket already connected or connecting');
      return;
    }
    
    console.log('Creating new WebSocket connection...');
    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log('WebSocket connected');
      set({ connected: true, ws });
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      const { type, data } = message;
      
      console.log('WebSocket message received:', type, {
        hasData: !!data,
        dataKeys: data ? Object.keys(data) : [],
      });

      switch (type) {
        case 'connected':
          console.log('Server connected:', data);
          break;

        case 'session:started':
          console.log('Session started:', {
            sessionId: data.sessionId,
            url: data.url,
            hasScreenshot: !!data.screenshot,
            screenshotLength: data.screenshot?.length || 0,
          });
          set({
            sessionId: data.sessionId,
            currentUrl: data.url,
            screenshot: data.screenshot ? `data:image/png;base64,${data.screenshot}` : null,
          });
          break;

        case 'session:closed':
          set({
            sessionId: null,
            currentUrl: '',
            screenshot: null,
            steps: [],
            recording: false,
          });
          break;

        case 'recorder:started':
          set({ recording: true });
          break;

        case 'recorder:stopped':
          set({ recording: false });
          break;

        case 'page:navigated':
          set({
            currentUrl: data.url,
            screenshot: data.screenshot ? `data:image/png;base64,${data.screenshot}` : null,
          });
          break;

        case 'page:screenshot':
          set({
            screenshot: data.screenshot ? `data:image/png;base64,${data.screenshot}` : null,
          });
          break;

        case 'step:recorded':
          console.log('📥 Step recorded from backend:', data.type, data.id);
          set((state) => ({
            steps: [...state.steps, data],
            isDirty: true,
          }));
          console.log(`✅ Step added to frontend store. Total steps: ${get().steps.length}`);
          // Auto-refresh screenshot
          get().requestScreenshot();
          // Auto-save after recording
          setTimeout(() => get().autoSave(), 2000);
          break;

        case 'step:added':
          set((state) => ({
            steps: [...state.steps, data],
            isDirty: true,
          }));
          break;

        case 'element:inspected':
          console.log('🔍 Element inspected:', { 
            hasData: !!data, 
            hasCandidates: !!data?.candidates,
            candidatesLength: data?.candidates?.length,
            recording: get().recording 
          });
          
          set({ inspectedElement: data });
          
          // Auto-record click step if recording
          const { recording } = get();
          if (recording && data && data.candidates && data.candidates.length > 0) {
            console.log('✅ Recording click step automatically');
            // Create click step automatically
            const clickStep: Omit<TestStep, 'id' | 'timestamp'> = {
              type: 'click',
              target: data,
            };
            get().addStep(clickStep as TestStep);
            
            // Auto-refresh screenshot after recording
            setTimeout(() => {
              get().requestScreenshot();
            }, 500);
          } else {
            console.log('⚠️ Not recording:', { 
              recording, 
              hasData: !!data,
              hasCandidates: data?.candidates?.length > 0
            });
          }
          break;

        case 'script:started':
          set({ running: true, currentStepIndex: 0 });
          break;

        case 'script:completed':
          set({ running: false, currentStepIndex: -1 });
          get().requestScreenshot();
          break;

        case 'script:error':
          set({ running: false, currentStepIndex: -1 });
          console.error('Script error:', data);
          alert(`Script failed: ${data.message}`);
          break;

        case 'error':
          console.error('Server error:', data);
          alert(`서버 에러: ${data.message}`);
          break;

        default:
          console.warn('Unknown message type:', type);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      set({ connected: false, ws: null });
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  },

  disconnect: () => {
    const { ws } = get();
    if (ws) {
      ws.close();
      set({ connected: false, ws: null });
    }
  },

  startSession: (baseUrl) => {
    const { ws } = get();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'session:start',
        data: { baseUrl },
      }));
    }
  },

  closeSession: () => {
    const { ws } = get();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'session:close',
        data: {},
      }));
    }
  },

  toggleRecording: () => {
    const { ws, recording } = get();
    if (ws && ws.readyState === WebSocket.OPEN) {
      const type = recording ? 'recorder:stop' : 'recorder:start';
      ws.send(JSON.stringify({ type, data: {} }));
    }
  },

  addStep: (step) => {
    const { ws } = get();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'step:add',
        data: { step },
      }));
    }
  },

  updateStep: (id, updates) => {
    set((state) => ({
      steps: state.steps.map((step) =>
        step.id === id ? { ...step, ...updates } : step
      ),
      isDirty: true,
    }));
  },

  removeStep: (id) => {
    set((state) => ({
      steps: state.steps.filter((s) => s.id !== id),
      isDirty: true,
    }));
  },

  inspectElement: (x, y) => {
    const { ws } = get();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'element:inspect',
        data: { x, y },
      }));
    }
  },

  runScript: () => {
    const { ws, steps } = get();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'script:run',
        data: { steps },
      }));
    }
  },

  navigateToUrl: (url) => {
    const { ws } = get();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'page:navigate',
        data: { url },
      }));
    }
  },

  requestScreenshot: () => {
    const { ws } = get();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'page:screenshot',
        data: {},
      }));
    }
  },

  // Save/Load actions
  saveScript: (name) => {
    const { steps, baseUrl, scriptName } = get();
    const finalName = name || scriptName;
    
    const scriptData = {
      name: finalName,
      baseUrl,
      steps,
      createdAt: Date.now(),
      version: '1.0',
    };
    
    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scriptData));
    
    set({ 
      isDirty: false, 
      lastSaved: Date.now(),
      scriptName: finalName 
    });
    
    console.log('✅ Script saved:', finalName);
  },

  loadScript: (data) => {
    if (confirm('현재 스크립트를 불러온 스크립트로 교체하시겠습니까?')) {
      set({
        steps: data.steps || [],
        baseUrl: data.baseUrl || '',
        scriptName: data.name || 'Loaded Script',
        isDirty: false,
        lastSaved: Date.now(),
      });
      console.log('✅ Script loaded:', data.name);
    }
  },

  downloadScript: (format: 'json' | 'html' | 'playwright' = 'json') => {
    const { steps, baseUrl, scriptName } = get();
    const timestamp = Date.now();
    const fileName = scriptName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    
    let content: string;
    let mimeType: string;
    let extension: string;

    if (format === 'html') {
      content = generateHTMLReport(scriptName, baseUrl, steps, timestamp);
      mimeType = 'text/html';
      extension = 'html';
    } else if (format === 'playwright') {
      content = generatePlaywrightCode(scriptName, baseUrl, steps);
      mimeType = 'text/typescript';
      extension = 'spec.ts';
    } else {
      // JSON
      const scriptData = {
        name: scriptName,
        baseUrl,
        steps,
        createdAt: timestamp,
        version: '1.0',
      };
      content = JSON.stringify(scriptData, null, 2);
      mimeType = 'application/json';
      extension = 'json';
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}_${timestamp}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log(`📥 Script downloaded as ${format.toUpperCase()}`);
  },

  autoSave: () => {
    const { steps, isDirty } = get();
    if (steps.length > 0 && isDirty) {
      get().saveScript();
      console.log('💾 Auto-saved');
    }
  },

  clearScript: () => {
    const { isDirty } = get();
    
    if (isDirty && !confirm('저장하지 않은 변경사항이 있습니다. 정말 초기화하시겠습니까?')) {
      return;
    }
    
    set({
      steps: [],
      scriptName: 'Untitled Script',
      isDirty: false,
      lastSaved: null,
    });
    
    localStorage.removeItem(STORAGE_KEY);
    console.log('🗑️ Script cleared');
  },

  setScriptName: (name) => {
    set({ scriptName: name, isDirty: true });
  },
}));

