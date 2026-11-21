import mongoose from 'mongoose';

export interface DatabaseConnectionOptions {
  uri: string;
  maxRetries?: number;
  retryIntervalMs?: number;
}

export class DatabaseConnectionManager {
  private static instance: DatabaseConnectionManager;
  private isConnected = false;

  public static getInstance(): DatabaseConnectionManager {
    if (!DatabaseConnectionManager.instance) {
      DatabaseConnectionManager.instance = new DatabaseConnectionManager();
    }
    return DatabaseConnectionManager.instance;
  }

  public async connect(options: DatabaseConnectionOptions): Promise<void> {
    if (this.isConnected) {
      return;
    }

    const maxRetries = options.maxRetries ?? 5;
    const retryIntervalMs = options.retryIntervalMs ?? 2000;
    let attempts = 0;

    while (attempts < maxRetries) {
      try {
        await mongoose.connect(options.uri, {
          maxPoolSize: 10,
          serverSelectionTimeoutMS: 5000,
        });
        this.isConnected = true;
        break;
      } catch (error) {
        attempts++;
        if (attempts >= maxRetries) {
          throw new Error(
            `Failed to connect to MongoDB after ${maxRetries} attempts: ${(error as Error).message}`,
          );
        }
        await new Promise((res) => setTimeout(res, retryIntervalMs));
      }
    }

    mongoose.connection.on('disconnected', () => {
      this.isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      this.isConnected = true;
    });
  }

  public async disconnect(): Promise<void> {
    if (this.isConnected || mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      this.isConnected = false;
    }
  }

  public getStatus(): boolean {
    return mongoose.connection.readyState === 1;
  }
}

export const dbConnection = DatabaseConnectionManager.getInstance();
