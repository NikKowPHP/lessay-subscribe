class MetricsService {
  constructor() {}

  async collectInteractionData(userIP: string, recording: any, aiResponse: any, recordingTime: number, responseTime: number, recordingSize: number): Promise<void> {
    try {
      // Collect relevant data
      const timestamp = new Date();
      const aiResponseLength = JSON.stringify(aiResponse).length;

      // Structure the data
      const interactionData = {
        userIP,
        timestamp,
        recordingSize,
        responseTime,
        aiResponseLength,
        recordingTime,
        // Add any other relevant data here
      };

      // Store the data (e.g., in a database or log file)
      await this.storeInteractionData(interactionData);

      console.log("Interaction data collected:", interactionData);
    } catch (error) {
      console.error("Error collecting interaction data:", error);
    }
  }

  private async storeInteractionData(data: any): Promise<void> {
    try {
      // Convert the data to a JSON string
      const dataString = JSON.stringify(data);

      // Store the data in local storage
      localStorage.setItem('interactionData', dataString);

      console.log("Interaction data stored in localStorage:", data);
    } catch (error) {
      console.error("Error storing interaction data in localStorage:", error);
    }
  }
}

export default MetricsService;
