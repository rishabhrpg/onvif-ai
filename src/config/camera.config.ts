import 'dotenv/config';

/**
 * ONVIF AI - Camera Configuration
 * 
 * MIT License
 * Copyright (c) 2025 Rishabh Gusain <r.gausai@gmail.com>
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

export interface CameraConfig {
  hostname: string;
  username: string;
  password: string;
  port: number;
  timeout?: number;
}

export interface AppConfig {
  camera: CameraConfig;
  events: {
    enabled: boolean;
    method: 'polling' | 'push';
    polling: {
      pullInterval: number;
      messageLimit: number;
      timeout: string;
      retryOnError: boolean;
      maxRetries: number;
    };
    push: {
      httpServer: {
        port: number;
        host: string;
        endpoint: string;
      };
    };
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    enableTimestamps: boolean;
  };
}

// Helper function to get environment variable with fallback
function getEnvVar(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

function getEnvNumber(key: string, fallback: number): number {
  const value = process.env[key];
  return value ? parseInt(value, 10) : fallback;
}

function getEnvBoolean(key: string, fallback: boolean): boolean {
  const value = process.env[key];
  return value ? value.toLowerCase() === 'true' : fallback;
}

// Default configuration loaded from environment variables
export const defaultConfig: AppConfig = {
  camera: {
    hostname: getEnvVar('CAMERA_HOST', '192.168.1.100'),
    username: getEnvVar('CAMERA_USERNAME', 'admin'),
    password: getEnvVar('CAMERA_PASSWORD', 'password123'),
    port: getEnvNumber('CAMERA_PORT', 2020),
    timeout: getEnvNumber('CAMERA_TIMEOUT', 30000),
  },
  events: {
    enabled: getEnvBoolean('EVENTS_ENABLED', true),
    method: (getEnvVar('EVENT_METHOD', 'push') as 'polling' | 'push'),
    polling: {
      pullInterval: getEnvNumber('POLLING_PULL_INTERVAL', 5000),
      messageLimit: getEnvNumber('POLLING_MESSAGE_LIMIT', 10),
      timeout: getEnvVar('POLLING_TIMEOUT', 'PT10S'),
      retryOnError: getEnvBoolean('POLLING_RETRY_ON_ERROR', true),
      maxRetries: getEnvNumber('POLLING_MAX_RETRIES', 3),
    },
    push: {
      httpServer: {
        port: getEnvNumber('PUSH_HTTP_PORT', 3001),
        host: getEnvVar('PUSH_HTTP_HOST', '192.168.1.100'),
        endpoint: getEnvVar('PUSH_HTTP_ENDPOINT', '/events'),
      },
    },
  },
  logging: {
    level: (getEnvVar('LOG_LEVEL', 'info') as 'debug' | 'info' | 'warn' | 'error'),
    enableTimestamps: getEnvBoolean('LOG_ENABLE_TIMESTAMPS', true),
  },
};

// Load configuration from environment variables
export function loadConfig(): AppConfig {
  // All configuration is now loaded from environment variables in defaultConfig
  // This allows for easy runtime overrides and keeps all env loading in one place
  return { ...defaultConfig };
}
