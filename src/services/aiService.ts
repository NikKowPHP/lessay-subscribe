import logger from '@/utils/logger';
import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import FormData from 'form-data';

interface GeminiResponse {
  candidates: {
    content: {
      parts: {
        text: string;
      }[];
      role: string;
    };
    finishReason: string;
    avgLogprobs: number;
  }[];
  usageMetadata: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
    promptTokensDetails: {
      modality: string;
      tokenCount: number;
    }[];
    candidatesTokensDetails: {
      modality: string;
      tokenCount: number;
    }[];
  };
  modelVersion: string;
}

// Type augmentation to include 'agent' in RequestInit
declare global {
  interface RequestInit {
    agent?: unknown; // Allow any type for agent
  }
}

class AIService {
  private apiKey: string;
  private proxyAgent: unknown | undefined;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.proxyAgent = this.createProxyAgent();
  }

  static models = {
    gemini_2_pro_exp: "gemini-2.0-pro-exp-02-05",
    gemini_2_flash_exp: "gemini-2.0-flash-exp",
    gemini_2_0_thinking_exp: "gemini-2.0-flash-thinking-exp-01-21",
    gemini_2_0_flash: "gemini-2.0-flash",
    gemini_2_0_flash_lite: "gemini-2.0-flash-lite-preview-02-05",
  }

  /**
   * Create and return a proxy agent if proxy environment variables are defined.
   */
  private createProxyAgent(): unknown | undefined {
    // Use HTTPS proxy preferentially; fallback to HTTP proxy.
    const proxyUrl = process.env.HTTPS_PROXY ||
                     process.env.HTTP_PROXY ||
                     process.env.https_proxy ||
                     process.env.http_proxy;
                     
    if (proxyUrl) {
      try {
        logger.log(`Using proxy: ${proxyUrl}`);
        return new HttpsProxyAgent(proxyUrl);
      } catch (err) {
        logger.error("Error creating proxy agent:", err);
        return undefined;
      }
    }
    return undefined;
  }

  /**
   * A generic helper function to retry an async operation.
   * Retries the operation up to "attempts" times with an increasing delay.
   */
  private async retryOperation<T>(operation: () => Promise<T>, attempts = 3, delayMs = 1000): Promise<T> {
    let lastError: any;
    for (let attempt = 0; attempt < attempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        logger.error(`Operation failed, attempt ${attempt + 1} of ${attempts}.`, error);
        if (attempt < attempts - 1) {
          // Exponential backoff: wait longer with each attempt.
          await new Promise(resolve => setTimeout(resolve, delayMs * (attempt + 1)));
        }
      }
    }
    throw lastError;
  }

  /**
   * Upload file using a single multipart/related request.
   *
   * This method emulates the Google AI Studio curl example:
   *
   * curl "https://generativelanguage.googleapis.com/upload/v1beta/files?key=${API_KEY}" \
   *   -H "X-Goog-Upload-Command: start, upload, finalize" \
   *   -H "X-Goog-Upload-Header-Content-Length: NUM_BYTES" \
   *   -H "X-Goog-Upload-Header-Content-Type: MIME_TYPE" \
   *   -H "Content-Type: application/json" \
   *   -d "{'file': {'display_name': 'DISPLAY_NAME'}}" \
   *   --data-binary "@FILENAME"
   *
   * The multipart request includes both the JSON metadata and the binary file.
   */
  async uploadFile(audioBuffer: Buffer, mimeType: string, displayName: string): Promise<string> {
    const uploadUrl = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${this.apiKey}`;
    
    // Create a new FormData instance.
    const form = new FormData();
    // Append the JSON metadata.
    form.append('metadata', JSON.stringify({ file: { display_name: displayName } }), {
      contentType: 'application/json'
    });
    // Append the binary file.
    form.append('file', audioBuffer, {
      filename: displayName,
      contentType: mimeType,
      knownLength: audioBuffer.length
    });

    // Build the headers (note: form.getHeaders() returns necessary multipart boundaries).
    const headers = {
      ...form.getHeaders(),
      'X-Goog-Upload-Command': 'start, upload, finalize',
      'X-Goog-Upload-Header-Content-Length': audioBuffer.length.toString(),
      'X-Goog-Upload-Header-Content-Type': mimeType,
    };

    const config: Record<string, unknown> = {
      headers,
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    };

    if (this.proxyAgent) {
      config.httpsAgent = this.proxyAgent;
      config.proxy = false;
    }

    return await this.retryOperation(async () => {
      const response = await axios.post(uploadUrl, form, config);
      logger.log("Upload response:", response.data);
      // Return the file URI from the response.
      return response.data.file.uri;
    });
  }

  async generateContent(fileUri: string, userMessage: string, systemMessage: string): Promise<Record<string, unknown>> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${AIService.models.gemini_2_pro_exp}:generateContent?key=${this.apiKey}`;
    
    const data = {
      contents: [{
        role: "user",
        parts: [
          {
            fileData: {
              fileUri: fileUri,
              mimeType: "audio/aac-adts"
            }
          },
          { text: userMessage }
        ]
      }],
      systemInstruction: {
        role: "system",
        parts: [{ text: systemMessage }]
      },
      generationConfig: {
        temperature: 1,
        topK: 64,
        topP: 0.95,
        maxOutputTokens: 8192,
        responseMimeType: "application/json"
      }
    };

    const config: Record<string, unknown> = {
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (this.proxyAgent) {
      config.httpsAgent = this.proxyAgent;
      config.proxy = false;
    }

    return await this.retryOperation(async () => {
      const response = await axios.post<GeminiResponse>(url, data, config);
      
      // Extract the JSON string from the response
      const jsonString = response.data.candidates[0].content.parts[0].text;
      const cleanedJson = jsonString
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      logger.log("Cleaned JSON:", cleanedJson);

      try {
        const analysisData = JSON.parse(cleanedJson);
        // Return the first item in the array as that's our analysis
        return analysisData[0];
      } catch (parseError) {
        logger.error("Error parsing Gemini response:", parseError);
        throw new Error("Failed to parse AI response");
      }
    });
  }
}

export default AIService;