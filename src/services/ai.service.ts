import logger from '@/utils/logger';
import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import FormData from 'form-data';
import ApiKeyGenerator from './generators/apiKeyGenerator';
import { IUploadableAIService } from '@/interfaces/ai-service.interface';

  export const models = {
    gemini_2_5_pro_exp: "gemini-2.5-pro-exp-03-05",
    gemini_2_0_flash_exp: "gemini-2.0-flash-exp",
    gemini_2_0_thinking_exp: "gemini-2.0-flash-thinking-exp-01-21",
    gemini_2_0_flash: "gemini-2.0-flash",
    gemini_2_0_flash_lite: "gemini-2.0-flash-lite-preview-02-05",
  }
interface GeminiResponse  {
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

class AIService implements  IUploadableAIService{
  private apiKey: string;
  private proxyAgent: unknown | undefined;

  constructor() {
    this.apiKey = ApiKeyGenerator.getInstance().getApiKey();
    this.proxyAgent = this.createProxyAgent();
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
    let lastError: unknown;
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
  // {
  //   "error": {
  //     "code": 429,
  //     "message": "Resource has been exhausted (e.g. check quota).",
  //     "status": "RESOURCE_EXHAUSTED"
  //   }
  // }
  

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

  async generateContent(fileUri: string, userMessage: string, systemMessage: string, model: string): Promise<Record<string, unknown>> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
    
    const data = {
      contents: [{
        role: "user",
        parts: [
          ...(fileUri ? [{
            fileData: {
              fileUri: fileUri,
              mimeType: "audio/webm"
            }
          }] : []),
          { text: userMessage }
        ]
      }],
      systemInstruction: {
        role: "system",
        parts: [{ text: systemMessage }]
      },
      generationConfig: {
        temperature: 0.3,
        // topK: 64,
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
      try {
        const response = await axios.post<GeminiResponse>(url, data, config);
        
        // Extract the JSON string from the response
        const jsonString = response.data.candidates[0].content.parts[0].text;
        const cleanedJson = jsonString
          .replace(/```json/g, '')
          .replace(/```/g, '')
          .trim();
        logger.log("Cleaned JSON:", cleanedJson)

        try {
          const analysisData = JSON.parse(cleanedJson);
          console.log("Analysis Data:", analysisData);

          if (Array.isArray(analysisData)) {
            if (analysisData.length === 0) {
              throw new Error("Empty analysis array");
            }
            return analysisData[0];
          }
          // Return the first item in the array as that's our analysis
          return analysisData;
        } catch (parseError) {
          logger.error("Error parsing Gemini response:", {
            error: parseError,
            response: response.data,
            cleanedJson
          });
          throw new Error(`Failed to parse AI response: ${parseError.message}`);
        }
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const errorDetails = {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            config: {
              url: error.config?.url,
              method: error.config?.method,
              headers: error.config?.headers,
              data: error.config?.data
            }
          };
          
          logger.error("Detailed API error:", errorDetails);
          throw new Error(`API request failed: ${error.response?.status} ${error.response?.statusText} - ${JSON.stringify(error.response?.data)}`);
        }
        logger.error("Unexpected error in generateContent:", error);
        throw new Error(`Unexpected error: ${error.message}`);
      }
    });
  }
}

export default AIService;