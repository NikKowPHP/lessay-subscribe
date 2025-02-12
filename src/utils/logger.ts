import { supabase } from "@/repositories/supabase/supabase";

class Logger {
  private isProduction: boolean;

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  error(message: string, ...args: unknown[]): void {
    if (!this.isProduction) {
      console.error(message, ...args);
    } else {
      // Prepare comprehensive error details
      const errorDetails = args.map(arg => {
        if (arg instanceof Error) {
          return {
            name: arg.name,
            message: arg.message,
            stack: arg.stack,
          };
        }
        return arg;
      });
      const errorData = {
        message,
        details: errorDetails,
        timestamp: new Date().toISOString(),
      };

      // Log error to Supabase without blocking the execution flow
      (async () => {
        const { error: supabaseError } = await supabase
          .from('error_logs')
          .insert([errorData]);
        if (supabaseError) {
          // If logging to Supabase fails in production, fallback to a basic console output.
          console.log("Failed to log error to Supabase:", supabaseError);
        }
      })();
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (!this.isProduction) {
      console.warn(message, ...args);
    } else {
      // Optionally, warnings can also be logged to Supabase in a similar fashion if needed.
      console.log(`Warning: ${message}`, ...args);
    }
  }

  log(message: string, ...args: unknown[]): void {
    if (!this.isProduction) {
      console.log(message, ...args);
    } else {
      // In production, standard logs can be suppressed, or adjust as needed.
    }
  }
}

const logger = new Logger();
export default logger;