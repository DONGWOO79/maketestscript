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
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001/ws';

// Note: Frontend runs on port 3002 to avoid conflict with qa-test-manager (port 3000)

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
          set((state) => ({
            steps: [...state.steps, data],
          }));
          // Auto-refresh screenshot
          get().requestScreenshot();
          break;

        case 'step:added':
          set((state) => ({
            steps: [...state.steps, data],
          }));
          break;

        case 'element:inspected':
          set({ inspectedElement: data });
          
          // Auto-record click step if recording
          const { recording } = get();
          if (recording && data && data.candidates && data.candidates.length > 0) {
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
    }));
  },

  removeStep: (id) => {
    set((state) => ({
      steps: state.steps.filter((s) => s.id !== id),
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
}));

