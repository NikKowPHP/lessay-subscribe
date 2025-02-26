// 'use server'
import { NextRequest, NextResponse } from 'next/server';
import RecordingService from '@/services/recording.service';
import logger from '@/utils/logger';
import { mockDetailedResponse, mockResponse } from '@/models/AiResponse.model';
import formidable, { IncomingForm, Fields, File } from 'formidable';
import { readFile } from 'fs/promises';
import { Readable } from 'stream';
import { IncomingMessage } from 'http';

export const config = {
  api: {
    bodyParser: false, // Disable default body parsing
  },
};

// Helper: Convert NextRequest into a Node.js-expected fake request
async function parseForm(
  req: NextRequest
): Promise<{ fields: Record<string, string[]>; files: Record<string, File[]> }> {
  // Read the full request body as a Buffer
  const buf = Buffer.from(await req.arrayBuffer());
  
  // Create a Node.js readable stream from the Buffer
  const stream = new Readable();
  stream.push(buf);
  stream.push(null);

  // Convert NextRequest headers (a Headers object) into a plain object
  const headersObj: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headersObj[key] = value;
  });
  
  // Ensure content-length is present – use the buffer length if not provided
  if (!headersObj['content-length']) {
    headersObj['content-length'] = buf.length.toString();
  }

  // Create a "fake" request by merging the stream with the headers.
  // Formidable will use `req.headers` (and specifically content-length) when parsing.
  const fakeReq = Object.assign(stream, { headers: headersObj });

  return new Promise((resolve, reject) => {
    const form = new IncomingForm();
    form.parse(fakeReq as unknown as IncomingMessage, (err, fields, files) => {
      if (err) {
        return reject(err);
      }
      // Type assertion to Fields<string>
      const typedFields = fields as Fields<string>;
      // Convert formidable fields to the desired type
      const parsedFields: Record<string, string[]> = {};
      for (const key in typedFields) {
        const value = typedFields[key];
        if (value !== undefined) {
          parsedFields[key] = Array.isArray(value) ? value : [value];
        }
      }
      // Type assertion to Record<string, formidable.File[]>
      const parsedFiles = files as Record<string, formidable.File[]>;
      resolve({ fields: parsedFields, files: parsedFiles });
    });
  });
}

export async function POST(req: NextRequest) {
  try {
    const { fields, files } = await parseForm(req);

    const audioFile = files.audio?.[0];
    const recordingTime = fields.recordingTime?.[0];
    const recordingSize = fields.recordingSize?.[0];
    const isDeepAnalysis = fields.isDeepAnalysis?.[0] === 'true';

    logger.log('isDeepAnalysis:', isDeepAnalysis);
    if (!audioFile || !recordingTime || !recordingSize) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    const userIP =
      req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for') || '';

    // logger.log('User IP:', userIP);


    // Read file buffer from the temporary file location provided by formidable
    const audioBuffer = await readFile(audioFile.filepath);
    
    const recordingService = new RecordingService();
    const fileUri = await recordingService.uploadFile(
      audioBuffer,
      audioFile.mimetype || 'audio/aac-adts',
      audioFile.originalFilename || 'recording.aac'
    );
    logger.log("File URI:", fileUri);

    let aiResponse;
    if (process.env.MOCK_AI_RESPONSE === 'true') {
      aiResponse = isDeepAnalysis ? mockDetailedResponse : mockResponse;
    } else {
      aiResponse = await recordingService.submitRecording(
        userIP,
        fileUri,  // Now using file URI instead of base64
        Number(recordingTime),
        Number(recordingSize),
        isDeepAnalysis
      );
    }
    logger.log("AI Response:", aiResponse);

    return NextResponse.json(
      { message: "Recording data received successfully", aiResponse },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred';
    logger.error("Subscription error:", errorMessage);
    return NextResponse.json(
      { message: "Internal server error", error: errorMessage },
      { status: 500 }
    );
  }
}