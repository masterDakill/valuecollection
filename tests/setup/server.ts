/// <reference lib="dom" />
// 🔧 Test Harness - Route toutes les requêtes HTTP locales vers l'app Hono
import app from "../../src/index";

const originalFetch = globalThis.fetch;

const TEST_ORIGINS = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://[::1]:3000",
]);

const dispatchToApp = (request: Request) => {
  // Mock ExecutionContext for testing
  const mockExecutionContext = {
    waitUntil: () => {},
    passThroughOnException: () => {},
  } as ExecutionContext;
  
  return app.fetch(request, { API_KEY: "test-key" } as any, mockExecutionContext);
};

globalThis.fetch = async (input: any, init?: RequestInit) => {
  const request = input instanceof Request ? input : new Request(input, init);
  const url = new URL(request.url);

  if (TEST_ORIGINS.has(`${url.protocol}//${url.host}`)) {
    const forwarded = new Request(request);
    return dispatchToApp(forwarded);
  }

  return originalFetch(input, init);
};

export {};
