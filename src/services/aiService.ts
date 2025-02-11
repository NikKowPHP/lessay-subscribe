class AIService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  static models = {
    gemini_2_pro_exp: "gemini-2.0-pro-exp-02-05",
    gemini_2_flash_exp: "gemini-2.0-flash-exp",
  }

  async generateContent(prompt: string): Promise<any> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${AIService.models.gemini_2_flash_exp}:generateContent?key=${this.apiKey}`;
    const data = {
      contents: [{
        parts: [{ text: prompt }]
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