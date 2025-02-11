class AIService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  static models = {
    gemini_2_pro_exp: "gemini-2.0-pro-exp-02-05",
    gemini_2_flash_exp: "gemini-2.0-flash-exp",
  }

  async generateContent(audioData: any): Promise<any> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;
    const data = {
      contents: [{
        parts: [{
          inline_data: {
            mime_type: 'audio/webm', // Adjust MIME type as needed
            data: audioData // Base64 encoded audio data
          }
        }]
      }]
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