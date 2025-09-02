export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * ONVIF AI - Logger Utility
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

export interface LoggerConfig {
  level: LogLevel;
  enableTimestamps: boolean;
}

export class Logger {
  private config: LoggerConfig;
  private levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor(config: LoggerConfig) {
    this.config = config;
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levels[level] >= this.levels[this.config.level];
  }

  private formatMessage(level: LogLevel, message: string, ...args: any[]): string {
    const timestamp = this.config.enableTimestamps 
      ? `[${new Date().toISOString()}]` 
      : '';
    
    const levelTag = `[${level.toUpperCase()}]`;
    const formattedArgs = args.length > 0 ? ` ${args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ')}` : '';
    
    return `${timestamp}${levelTag} ${message}${formattedArgs}`;
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', message, ...args));
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message, ...args));
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, ...args));
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, ...args));
    }
  }

  // Convenience methods with emojis for better visibility
  success(message: string, ...args: any[]): void {
    this.info(`✅ ${message}`, ...args);
  }

  failure(message: string, ...args: any[]): void {
    this.error(`❌ ${message}`, ...args);
  }

  warning(message: string, ...args: any[]): void {
    this.warn(`⚠️ ${message}`, ...args);
  }
}
