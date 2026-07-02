import "@testing-library/jest-dom";

// Polyfill fetch for jsdom environment
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fetchPolyfill = require("cross-fetch");
(globalThis as any).fetch = fetchPolyfill;
(globalThis as any).Headers = fetchPolyfill.Headers;
(globalThis as any).Request = fetchPolyfill.Request;
(globalThis as any).Response = fetchPolyfill.Response;
// Also set on window for jsdom compatibility
if (typeof window !== "undefined") {
  (window as any).fetch = fetchPolyfill;
  (window as any).Headers = fetchPolyfill.Headers;
  (window as any).Request = fetchPolyfill.Request;
  (window as any).Response = fetchPolyfill.Response;
}
