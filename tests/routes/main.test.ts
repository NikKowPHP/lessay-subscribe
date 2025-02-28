import { NextRequest } from 'next/server';
import { POST as TTS_POST } from '@/app/api/tts/route';
import { POST as RECORDING_POST } from '@/app/api/recording/route';
import { POST as SUBSCRIBE_POST } from '@/app/api/subscribe/route';

// Mock the services so we can control behavior in tests.
jest.mock('@/services/tts.service', () => {
  return {
    TTS: jest.fn().mockImplementation(() => ({
      generateAudio: jest.fn().mockResolvedValue(Buffer.from('audio'))
    }))
  };
});

// Replace the current supabase mock with a chainable queryBuilder.
// Move the queryBuilder declaration inside the factory callback to avoid referencing out-of-scope variables.
jest.mock('@/repositories/supabase/supabase', () => {
  const queryBuilder = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn(), // we will override this in each test.
    insert: jest.fn(),
    // Make our chain thenable by defining a then function.
    then: function (resolve: (value: unknown) => void) {
      return resolve(this);
    },
  };

  return {
    supabase: {
      from: jest.fn(() => queryBuilder),
      // Expose the query builder so that tests can override its methods:
      __queryBuilder: queryBuilder,
    },
  };
});

jest.mock('@/services/polly.service', () => {
  return {
    PollyService: jest.fn().mockImplementation(() => ({}))
  };
});

// jest.mock('@supabase/supabase-js');

describe('TTS API POST route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return 400 for missing required fields', async () => {
    // Missing the "language" field.
    const req = new NextRequest('http://localhost/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Hello' })
    });
    
    const res = await TTS_POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toMatch(/Missing required fields/);
  });

  test('should return an audio buffer when valid input is provided', async () => {
    const req = new NextRequest('http://localhost/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Hello', language: 'en' })
    });
    
    const res = await TTS_POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('audio/mpeg');
    // Expect the audio buffer to be nonempty.
    const arrayBuffer = await res.arrayBuffer();
    expect(arrayBuffer.byteLength).toBeGreaterThan(0);
  });

  test('should return a 500 error when generateAudio throws', async () => {
    // Override the TTS mock so that generateAudio rejects.
    const { TTS } = require('@/services/tts.service');
    TTS.mockImplementationOnce(() => ({
      generateAudio: jest.fn().mockRejectedValue(new Error('Generation failed'))
    }));

    const req = new NextRequest('http://localhost/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Hello', language: 'en' })
    });
    
    const res = await TTS_POST(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.message).toBe('Phoneme generation failed');
    expect(data.error).toBe('Generation failed');
  });
});

jest.mock('@/services/recording.service', () => ({
  RecordingService: jest.fn().mockImplementation(() => ({
    uploadFile: jest.fn().mockResolvedValue('mock-uri'),
    submitRecording: jest.fn().mockResolvedValue({ mock: 'response' })
  }))
}));

describe('Recording API', () => {
  // Helper to create a fake NextRequest with form data.
  const mockFormDataRequest = async (body: Buffer, headers: globalThis.Headers) => {
    const req = new NextRequest('http://localhost/api/recording', {
      method: 'POST',
      headers,
      body
    });
    
    // For formidable parsing, set the Content-Type header to multipart/form-data with a boundary.
    req.headers.set('Content-Type', 'multipart/form-data; boundary=test');
    return req;
  };

  test('should reject invalid form data', async () => {
    const req = await mockFormDataRequest(Buffer.from('invalid content'), new Headers());
    const res = await RECORDING_POST(req);
    expect(res.status).toBe(400);
  });
});

describe('Subscription API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return 400 for invalid email address', async () => {
    const req = new NextRequest('http://localhost/api/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: 'invalid-email' }),
    });

    const res = await SUBSCRIBE_POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toBe('Invalid email address');
  });

  test('should return 200 for existing email address', async () => {
    // Get our mocked supabase.
    const { supabase } = require('@/repositories/supabase/supabase');

    // Override the chain for the email lookup.
    // Note that in the route, the chain is: supabase.from(...).select('*').eq('email', email)
    // Because our from() returns queryBuilder (the same object), we call .select() (which returns queryBuilder too)
    // and then override eq() to return a promise resolving with the desired value.
    supabase.from().eq.mockResolvedValue({ data: [{ email: 'test@example.com' }] });
    
    const req = new NextRequest('http://localhost/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com' }),
    });

    const res = await SUBSCRIBE_POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.message).toBe('Email already exists');
  });

  test.only('should return 200 for successful subscription', async () => {
      // Get the mocked supabase.
      const { supabase } = require('@/repositories/supabase/supabase');
      // Simulate no existing email.
      supabase.__queryBuilder.eq.mockResolvedValue({ data: [] });
      // Simulate a successful insertion.
      supabase.__queryBuilder.insert.mockResolvedValue({ error: null });
  
      const req = new NextRequest('http://localhost/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: 'new@example.com' }),
      });
  
      const res = await SUBSCRIBE_POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.message).toBe('Subscription successful');
  });

  test('should return 500 for Supabase insertion error', async () => {
    // Mock Supabase to simulate an insertion error
    const mockSupabase = require('@/repositories/supabase/supabase').supabase;
    mockSupabase.select.mockResolvedValue({ data: [] }); // No existing email
    mockSupabase.insert.mockResolvedValue({ error: new Error('Supabase error') });

    const req = new NextRequest('http://localhost/api/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: 'error@example.com' }),
    });

    const res = await SUBSCRIBE_POST(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.message).toBe('Supabase error');
  });
});