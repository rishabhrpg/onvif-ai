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

import 'dotenv/config';

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
    subscription: {
      renewalEnabled: boolean;
      renewalIntervalMs: number;
      maxRenewalRetries: number;
      renewalTimeoutMs: number;
      alertOnFailure: boolean;
    };
  };
  alerts: {
    enabled: boolean;
    webhookUrl: string;
    timeout: number;
    retryAttempts: number;
    retryDelay: number;
    throttling: {
      enabled: boolean;
      windowMs: number;
      maxAlertsPerWindow: number;
      debounceMs: number;
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

// Helper function to get environment number with fallback
function getEnvNumber(key: string, fallback: number): number {
  const value = process.env[key];
  return value ? parseInt(value, 10) : fallback;
}

// Helper function to get environment boolean with fallback
function getEnvBoolean(key: string, fallback: boolean): boolean {
  const value = process.env[key];
  if (value === undefined) return fallback;
  return value.toLowerCase() === 'true';
}

// Default configuration with environment variable overrides
const defaultConfig: AppConfig = {
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
    subscription: {
      renewalEnabled: getEnvBoolean('SUBSCRIPTION_RENEWAL_ENABLED', true),
      renewalIntervalMs: getEnvNumber('SUBSCRIPTION_RENEWAL_INTERVAL_MS', 90000), // 90 seconds (30s before 2min timeout)
      maxRenewalRetries: getEnvNumber('SUBSCRIPTION_MAX_RENEWAL_RETRIES', 3),
      renewalTimeoutMs: getEnvNumber('SUBSCRIPTION_RENEWAL_TIMEOUT_MS', 10000), // 10 seconds
      alertOnFailure: getEnvBoolean('SUBSCRIPTION_ALERT_ON_RENEWAL_FAILURE', true),
    },
  },
  alerts: {
    enabled: getEnvBoolean('ALERTS_ENABLED', false),
    webhookUrl: getEnvVar('ALERTS_WEBHOOK_URL', ''),
    timeout: getEnvNumber('ALERTS_TIMEOUT', 5000),
    retryAttempts: getEnvNumber('ALERTS_RETRY_ATTEMPTS', 3),
    retryDelay: getEnvNumber('ALERTS_RETRY_DELAY', 1000),
    throttling: {
      enabled: getEnvBoolean('ALERTS_THROTTLING_ENABLED', true),
      windowMs: getEnvNumber('ALERTS_THROTTLING_WINDOW_MS', 60000), // 1 minute window
      maxAlertsPerWindow: getEnvNumber('ALERTS_THROTTLING_MAX_PER_WINDOW', 5), // Max 5 alerts per minute
      debounceMs: getEnvNumber('ALERTS_THROTTLING_DEBOUNCE_MS', 5000), // 5 second debounce
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
