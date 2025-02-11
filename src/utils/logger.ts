class Logger {
  private isProduction: boolean;

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  error(message: string, ...args: any[]): void {
    if (!this.isProduction) {
      console.error(message, ...args);
    } else {
      console.log(`Error: ${message}`); // Basic logging in production
    }
  }

  warn(message: string, ...args: any[]): void {
    if (!this.isProduction) {
      console.warn(message, ...args);
    } else {
      console.log(`Warning: ${message}`);
    }
  }

  log(message: string, ...args: any[]): void {
    if (!this.isProduction) {
      console.log(message, ...args);
    } else {
      // Suppress logs in production
    }
  }
}

const logger = new Logger();
export default logger;