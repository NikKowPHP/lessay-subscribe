import { NextRequest } from 'next/server';
import { POST as TTS_POST } from '@/app/api/tts/route';
import { POST as RECORDING_POST } from '@/app/api/recording/route';

// Mock the services so we can control behavior in tests.
jest.mock('@/services/tts.service', () => {
  return {
    TTS: jest.fn().mockImplementation(() => ({
      generateAudio: jest.fn().mockResolvedValue(Buffer.from('audio'))
    }))
  };
});

jest.mock('@/services/polly.service', () => {
  return {
    PollyService: jest.fn().mockImplementation(() => ({}))
  };
});

jest.mock('@supabase/supabase-js');

describe('TTS API POST route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return 400 for missing required fields', async () => {
    // Missing the "language" field.
    const req = new NextRequest('http://localhost/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      // duplex: 'half',
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
      headers: {
        'Content-Type': 'application/json'
      },
      // duplex: 'half',
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
      headers: {
        'Content-Type': 'application/json'
      },
      // duplex: 'half',
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
      // duplex: 'half',
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