import fetch, { Request, Response, Headers } from 'node-fetch';
import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
import '@testing-library/jest-dom';


// Polyfill TextEncoder and TextDecoder for Next.js request parsing in Node.
globalThis.TextEncoder = TextEncoder;
globalThis.TextDecoder = TextDecoder;
globalThis.Headers = Headers;
globalThis.Request = Request;
globalThis.Response = Response;
globalThis.fetch = fetch;

process.env.NEXT_PUBLIC_SUPABASE_URL = 'mock-url';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'mock-key';

if (!globalThis.Request) {
  globalThis.Request = Request;
  globalThis.Response = Response;
  globalThis.Headers = Headers;
  globalThis.fetch = fetch;
}