class ApiKeyGenerator {
  private static instance: ApiKeyGenerator;
  private apiKeys: string[] = [];
  private currentIndex: number = 0;
  
  private constructor() {
    this.instantiateApiKeys();
  }

  public static getInstance(): ApiKeyGenerator {
    if (!ApiKeyGenerator.instance) {
      ApiKeyGenerator.instance = new ApiKeyGenerator();
    }
    return ApiKeyGenerator.instance;
  }

  public getApiKey(): string {
    return this.getNextApiKey();
  }

  private instantiateApiKeys(): void {
    let index = 1;
    while (process.env[`AI_API_KEY_${index}`]) {
      this.apiKeys.push(process.env[`AI_API_KEY_${index}`] as string);
      index++;
    }
  }

  private getNextApiKey(): string {
    const currentApiKey = this.apiKeys[this.currentIndex];
    const apiKeysLength = this.apiKeys.length;
    this.currentIndex = (this.currentIndex + 1) % apiKeysLength;

    return currentApiKey;
  }

}

export default ApiKeyGenerator;