import logger from '@/utils/logger';
import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';

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

  async uploadFile(audioBuffer: Buffer, mimeType: string, displayName: string): Promise<string> {
    const uploadUrl = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${this.apiKey}`;
    
    const config: Record<string, unknown> = {
      headers: {
        'X-Goog-Upload-Command': 'start, upload, finalize',
        'X-Goog-Upload-Header-Content-Length': audioBuffer.length.toString(),
        'X-Goog-Upload-Header-Content-Type': mimeType,
        'Content-Type': 'application/json'
      }
    };

    if (this.proxyAgent) {
      config.httpsAgent = this.proxyAgent;
      config.proxy = false;
    }

    try {
      const response = await axios.post(uploadUrl, {
        file: { display_name: displayName }
      }, config);
      
      // Upload the binary data
      await axios.put(response.headers['x-goog-upload-url'], audioBuffer, {
        headers: {
          'Content-Length': audioBuffer.length.toString(),
          'Content-Type': mimeType
        }
      });

      return response.data.file.uri;
    } catch (error) {
      logger.error("File upload error:", error);
      throw new Error("Failed to upload audio file");
    }
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

    // Axios configuration object
    const config: Record<string, unknown> = {
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (this.proxyAgent) {
      config.httpsAgent = this.proxyAgent;
      config.proxy = false;
    }

    try {
      const response = await axios.post<GeminiResponse>(url, data, config);
      
      // Extract the JSON string from the response
      const jsonString = response.data.candidates[0].content.parts[0].text;

      const cleanedJson = jsonString
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();
      logger.log("Cleaned JSON:", cleanedJson);

      
      // Parse the JSON string to get the actual analysis object
      try {
        const analysisData = JSON.parse(cleanedJson);
        // Return the first item in the array as that's our analysis
        return analysisData[0];
      } catch (parseError) {
        logger.error("Error parsing Gemini response:", parseError);
        throw new Error("Failed to parse AI response");
      }
    } catch (error: unknown) {
      // Comprehensive error handling
      if (axios.isAxiosError(error)) {
        logger.error("Axios error calling Gemini API:");
        logger.error("Status:", error.response?.status);
        logger.error("Data:", error.response?.data);
        logger.error("Config:", error.config);
      } else {
        logger.error("Unexpected error:", error);
      }
      throw new Error(`Failed to generate content from AI: ${error}`);
    }
  }
}

export default AIService;