import { POST } from '@/app/api/tts/route';
import { NextRequest } from 'next/server';




// We mock the services so we can control their behavior in tests.
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
    const req = new NextRequest('http://localhost:3000/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json', // Add this header
        duplex: 'half',
    },
      body: JSON.stringify({ text: 'Hello' })
    });
    
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toMatch(/Missing required fields/);
  });

  test('should return an audio buffer when valid input is provided', async () => {
    const req = new NextRequest('http://localhost/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json', // Add this header
        duplex: 'half',
    },
      body: JSON.stringify({ text: 'Hello', language: 'en' })
    });
    
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('audio/mpeg');
    // We expect the audio buffer to be nonempty.
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
        'Content-Type': 'application/json', // Add this header
        duplex: 'half',
    },
      body: JSON.stringify({ text: 'Hello', language: 'en' })
    });
    
    const res = await POST(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.message).toBe('Phoneme generation failed');
    expect(data.error).toBe('Generation failed');
  });
});