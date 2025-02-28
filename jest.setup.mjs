import fetch, { Request, Response, Headers } from 'node-fetch';
import '@testing-library/jest-dom';

process.env.NEXT_PUBLIC_SUPABASE_URL = 'mock-url';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'mock-key';

if (!globalThis.Request) {
  globalThis.Request = Request;
  globalThis.Response = Response;
  globalThis.Headers = Headers;
  globalThis.fetch = fetch;
}