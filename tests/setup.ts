// Test setup for Vitest
if (typeof globalThis.WebSocket === 'undefined') {
  class MockWebSocket {
    static readonly CONNECTING = 0;
    static readonly OPEN = 1;
    static readonly CLOSING = 2;
    static readonly CLOSED = 3;
    readonly CONNECTING = 0;
    readonly OPEN = 1;
    readonly CLOSING = 2;
    readonly CLOSED = 3;
    readyState = 1;
    onopen: ((event: unknown) => void) | null = null;
    onclose: ((event: unknown) => void) | null = null;
    onmessage: ((event: unknown) => void) | null = null;
    onerror: ((event: unknown) => void) | null = null;
    constructor(_url?: string | URL, _protocols?: string | string[]) {}
    send(_data: unknown) {}
    close(_code?: number, _reason?: string) {}
    addEventListener(_event: string, _listener: unknown) {}
    removeEventListener(_event: string, _listener: unknown) {}
    dispatchEvent(_event: unknown) { return true; }
  }

  // @ts-expect-error polyfill for Node.js test environment
  globalThis.WebSocket = MockWebSocket;
}
