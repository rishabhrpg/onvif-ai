/**
 * ONVIF AI - Alert Service
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

import { EventEmitter } from 'events';
import { Logger } from '../utils/logger';
import { ProcessedEvent } from './event.service';

export interface AlertConfig {
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
  logger: Logger;
}

export interface AlertPayload {
  eventId: string;
  eventType: string;
  timestamp: string;
  topic: string;
  source: string;
  data: any;
  cameraInfo?: {
    hostname: string;
    model?: string;
    manufacturer?: string;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
}

interface ThrottleRecord {
  count: number;
  windowStart: number;
  lastEventTime: number;
  debounceTimer?: NodeJS.Timeout;
}

export class AlertService extends EventEmitter {
  private config: AlertConfig;
  private logger: Logger;
  private alertCounter = 0;
  private isEnabled: boolean;
  private throttleMap = new Map<string, ThrottleRecord>();

  constructor(config: AlertConfig) {
    super();
    this.config = config;
    this.logger = config.logger;
    this.isEnabled = config.enabled;
  }

  /**
   * Enable alert service
   */
  enable(): void {
    this.isEnabled = true;
    this.logger.info('🔔 Alert service enabled');
  }

  /**
   * Disable alert service
   */
  disable(): void {
    this.isEnabled = false;
    this.logger.info('🔕 Alert service disabled');
  }

  /**
   * Check if alert service is enabled
   */
  isAlertEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Send alert for a processed event with throttling
   */
  async sendAlert(event: ProcessedEvent, cameraInfo?: any): Promise<void> {
    if (!this.isEnabled) {
      this.logger.debug('Alert service is disabled, skipping alert');
      return;
    }

    if (!this.config.webhookUrl) {
      this.logger.warning('No webhook URL configured, skipping alert');
      return;
    }

    // Apply throttling if enabled
    if (this.config.throttling.enabled) {
      if (!this.shouldSendAlert(event)) {
        this.logger.debug(`Alert throttled for ${event.type}`, {
          eventId: event.id,
          throttling: this.getThrottleStatus(event.type)
        });
        return;
      }
    }

    try {
      const alertPayload = this.createAlertPayload(event, cameraInfo);
      await this.sendWebhook(alertPayload);
      
      this.alertCounter++;
      this.logger.info(`📨 Alert sent for ${event.type} event`, {
        eventId: event.id,
        webhookUrl: this.maskUrl(this.config.webhookUrl),
        alertCount: this.alertCounter
      });

      // Emit alert sent event
      this.emit('alertSent', { event, payload: alertPayload });

    } catch (error) {
      this.logger.error('Failed to send alert', error);
      this.emit('alertFailed', { event, error });
    }
  }

  /**
   * Check if alert should be sent based on throttling rules
   */
  private shouldSendAlert(event: ProcessedEvent): boolean {
    const eventType = event.type;
    const now = Date.now();
    const throttleConfig = this.config.throttling;

    // Get or create throttle record for this event type
    let record = this.throttleMap.get(eventType);
    if (!record) {
      record = {
        count: 0,
        windowStart: now,
        lastEventTime: 0,
      };
      this.throttleMap.set(eventType, record);
    }

    // Check if we need to reset the window
    if (now - record.windowStart >= throttleConfig.windowMs) {
      record.count = 0;
      record.windowStart = now;
    }

    // Check rate limiting (max alerts per window)
    if (record.count >= throttleConfig.maxAlertsPerWindow) {
      this.logger.debug(`Rate limit exceeded for ${eventType}`, {
        count: record.count,
        maxPerWindow: throttleConfig.maxAlertsPerWindow,
        windowMs: throttleConfig.windowMs
      });
      return false;
    }

    // Check debouncing (minimum time between alerts of same type)
    const timeSinceLastAlert = now - record.lastEventTime;
    if (record.lastEventTime > 0 && timeSinceLastAlert < throttleConfig.debounceMs) {
      this.logger.debug(`Debounce active for ${eventType}`, {
        timeSinceLastAlert,
        debounceMs: throttleConfig.debounceMs
      });

      // Clear existing debounce timer if any
      if (record.debounceTimer) {
        clearTimeout(record.debounceTimer);
      }

      // Set new debounce timer
      record.debounceTimer = setTimeout(() => {
        this.logger.debug(`Debounce expired for ${eventType}, next alert allowed`);
        delete record!.debounceTimer;
      }, throttleConfig.debounceMs - timeSinceLastAlert);

      return false;
    }

    // Update throttle record
    record.count++;
    record.lastEventTime = now;

    return true;
  }

  /**
   * Get throttle status for an event type
   */
  private getThrottleStatus(eventType: string): any {
    const record = this.throttleMap.get(eventType);
    if (!record) return { status: 'no_record' };

    const now = Date.now();
    const throttleConfig = this.config.throttling;

    return {
      count: record.count,
      maxPerWindow: throttleConfig.maxAlertsPerWindow,
      windowRemainingMs: throttleConfig.windowMs - (now - record.windowStart),
      timeSinceLastAlert: now - record.lastEventTime,
      debounceRemainingMs: Math.max(0, throttleConfig.debounceMs - (now - record.lastEventTime)),
      isDebouncing: record.debounceTimer !== undefined
    };
  }

  /**
   * Create alert payload from processed event
   */
  private createAlertPayload(event: ProcessedEvent, cameraInfo?: any): AlertPayload {
    const severity = this.determineSeverity(event.type);
    const message = this.generateAlertMessage(event);

    return {
      eventId: event.id,
      eventType: event.type,
      timestamp: event.timestamp.toISOString(),
      topic: event.topic,
      source: event.source,
      data: event.data,
      cameraInfo: cameraInfo ? {
        hostname: cameraInfo.hostname,
        model: cameraInfo.model,
        manufacturer: cameraInfo.manufacturer
      } : undefined,
      severity,
      message
    };
  }

  /**
   * Determine alert severity based on event type
   */
  private determineSeverity(eventType: string): 'low' | 'medium' | 'high' | 'critical' {
    switch (eventType.toLowerCase()) {
      case 'peopledetection':
        return 'high';
      case 'tamper':
      case 'tampering':
        return 'critical';
      case 'motionalarm':
      case 'motion':
        return 'medium';
      case 'objectdetection':
        return 'medium';
      case 'device':
        return 'low';
      default:
        return 'medium';
    }
  }

  /**
   * Generate human-readable alert message
   */
  private generateAlertMessage(event: ProcessedEvent): string {
    const timestamp = event.timestamp.toLocaleString();
    
    switch (event.type.toLowerCase()) {
      case 'peopledetection':
        return `👤 Person detected at ${timestamp}`;
      case 'motionalarm':
      case 'motion':
        return `🚶 Motion detected at ${timestamp}`;
      case 'objectdetection':
        return `🎯 Object detected at ${timestamp}`;
      case 'tamper':
      case 'tampering':
        return `⚠️ Camera tampering detected at ${timestamp}`;
      case 'device':
        return `🔧 Device event occurred at ${timestamp}`;
      default:
        return `🔔 ${event.type} event detected at ${timestamp}`;
    }
  }

  /**
   * Send webhook with retry logic
   */
  private async sendWebhook(payload: AlertPayload): Promise<void> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const response = await fetch(this.config.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'ONVIF-AI-Alert-Service/1.0.0'
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(this.config.timeout)
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Success
        if (attempt > 1) {
          this.logger.info(`Webhook sent successfully on attempt ${attempt}`);
        }
        return;

      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.config.retryAttempts) {
          this.logger.warning(`Webhook attempt ${attempt} failed, retrying in ${this.config.retryDelay}ms`, error);
          await this.delay(this.config.retryDelay);
        }
      }
    }

    // All attempts failed
    throw new Error(`Webhook failed after ${this.config.retryAttempts} attempts: ${lastError?.message}`);
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Mask sensitive parts of URL for logging
   */
  private maskUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}***`;
    } catch {
      return 'invalid-url';
    }
  }

  /**
   * Get alert service statistics
   */
  getStats(): { enabled: boolean; alertCount: number; webhookUrl: string; throttling?: any } {
    const stats: any = {
      enabled: this.isEnabled,
      alertCount: this.alertCounter,
      webhookUrl: this.config.webhookUrl ? this.maskUrl(this.config.webhookUrl) : 'not-configured'
    };

    // Add throttling stats if enabled
    if (this.config.throttling.enabled) {
      stats.throttling = {
        enabled: true,
        windowMs: this.config.throttling.windowMs,
        maxAlertsPerWindow: this.config.throttling.maxAlertsPerWindow,
        debounceMs: this.config.throttling.debounceMs,
        eventTypes: {}
      };

      // Add per-event-type throttling status
      for (const [eventType, record] of this.throttleMap.entries()) {
        stats.throttling.eventTypes[eventType] = this.getThrottleStatus(eventType);
      }
    }

    return stats;
  }

  /**
   * Test webhook connectivity
   */
  async testWebhook(): Promise<boolean> {
    if (!this.config.webhookUrl) {
      throw new Error('No webhook URL configured');
    }

    const testPayload: AlertPayload = {
      eventId: 'test-' + Date.now(),
      eventType: 'test',
      timestamp: new Date().toISOString(),
      topic: 'test/webhook',
      source: 'alert-service',
      data: { test: true },
      severity: 'low',
      message: '🧪 Test alert from ONVIF AI Alert Service'
    };

    try {
      await this.sendWebhook(testPayload);
      this.logger.success('✅ Webhook test successful');
      return true;
    } catch (error) {
      this.logger.error('❌ Webhook test failed', error);
      return false;
    }
  }

  /**
   * Clear throttle records (useful for testing or reset)
   */
  clearThrottleRecords(): void {
    // Clear any active debounce timers
    for (const record of this.throttleMap.values()) {
      if (record.debounceTimer) {
        clearTimeout(record.debounceTimer);
      }
    }
    
    this.throttleMap.clear();
    this.logger.info('🧹 Alert throttle records cleared');
  }

  /**
   * Get throttling configuration
   */
  getThrottlingConfig(): any {
    return {
      enabled: this.config.throttling.enabled,
      windowMs: this.config.throttling.windowMs,
      maxAlertsPerWindow: this.config.throttling.maxAlertsPerWindow,
      debounceMs: this.config.throttling.debounceMs
    };
  }
}
