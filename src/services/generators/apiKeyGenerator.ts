class ApiKeyGenerator {
  private apiKeys: string[] = [];
  private currentIndex: number = 0;
  constructor() {}

    public getApiKey(): string {
    }

  private instantiateApiKeys(): void {
    const apiKeys = process.env.API_KEYS;
    if (apiKeys) {
      this.apiKeys = apiKeys.split(',');
    }
  }
  private getNextApiKey(): string {
    const currentApiKey = this.apiKeys[this.currentIndex];
    const apiKeysLength = this.apiKeys.length;
    this.currentIndex = (this.currentIndex + 1) % apiKeysLength;

    return currentApiKey;
  }
  private checkIfLastIndex(): boolean {
    return this.currentIndex === this.apiKeys.length - 1;
  }
}
export default ApiKeyGenerator;
