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
    agent?: any; // Allow any type for agent
  }
}

class AIService {
  private apiKey: string;
  private proxyAgent: any | undefined;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.proxyAgent = this.createProxyAgent();
  }

  static models = {
    gemini_2_pro_exp: "gemini-2.0-pro-exp-02-05",
    gemini_2_flash_exp: "gemini-2.0-flash-exp",
  }

  /**
   * Create and return a proxy agent if proxy environment variables are defined.
   */
  private createProxyAgent(): any | undefined {
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

  async generateContent(audioDataBase64: string, userMessage: string, systemMessage: string): Promise<any> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${AIService.models.gemini_2_flash_exp}:generateContent?key=${this.apiKey}`;
    
    const data = {
      contents: [{
        role: "user",
        parts: [
          {
            inlineData: {
              data: audioDataBase64,
              mimeType: "audio/mpeg"
            }
          },
          { text: userMessage }
        ]
      }],
      systemInstruction: {
        role: "user",
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
    const config: any = {
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
      
      // Parse the JSON string to get the actual analysis object
      try {
        const analysisData = JSON.parse(jsonString);
        // Return the first item in the array as that's our analysis
        return analysisData[0];
      } catch (parseError) {
        logger.error("Error parsing Gemini response:", parseError);
        throw new Error("Failed to parse AI response");
      }
    } catch (error: any) {
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