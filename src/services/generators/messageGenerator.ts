class MessageGenerator {
  constructor() {}

  generateUserMessage(recording: any): string {
    // Logic to generate the user message from the recording
    // This is a placeholder; replace with your actual logic
    return `User recording: ${recording}`;
  }

  generateSystemMessage(): string {
    // Logic to generate the system message
    // This is a placeholder; replace with your actual logic
    return "You are a helpful AI assistant.";
  }
}

export default MessageGenerator;