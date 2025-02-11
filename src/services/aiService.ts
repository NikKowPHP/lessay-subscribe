class AIService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  static models = {
    gemini_2_pro_exp: "gemini-2.0-pro-exp-02-05",
    gemini_2_flash_exp: "gemini-2.0-flash-exp",
  }



  async generateContent(audioDataBase64: string, userMessage: string, systemMessage: string): Promise<any> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${AIService.models.gemini_2_pro_exp}:generateContent?key=${this.apiKey}`;
    
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

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      throw error;
    }
  }
}

export default AIService;