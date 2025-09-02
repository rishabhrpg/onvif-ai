/**
 * ONVIF AI - Main Application
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

import { ONVIFService } from './services/onvif.service';
import { EventService, ProcessedEvent } from './services/event.service';
import { AlertService } from './services/alert.service';
import { Logger } from './utils/logger';
import { AppConfig } from './config/camera.config';

export class ONVIFApp {
  private onvifService: ONVIFService;
  private eventService: EventService;
  private alertService: AlertService | null = null;
  private logger: Logger;
  private config: AppConfig;
  private isRunning = false;

  constructor(config: AppConfig) {
    this.config = config;
    this.logger = new Logger(config.logging);
    
    // Initialize core services
    this.onvifService = new ONVIFService({
      ...config.camera,
      logger: this.logger,
    });
    
    // EventService only handles events, no alerts
    this.eventService = new EventService(this.onvifService, {
      method: config.events.method,
      polling: config.events.polling,
      push: config.events.push,
      logger: this.logger,
    });

    // App manages AlertService independently
    if (config.alerts.enabled) {
      this.alertService = new AlertService({
        ...config.alerts,
        logger: this.logger,
      });
      this.logger.info('🔔 Alert service initialized');
    }

    // App orchestrates the interaction between services
    this.setupEventHandlers();
  }

  /**
   * Start the ONVIF application
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warning('Application is already running');
      return;
    }

    try {
      this.logger.info('🚀 Starting ONVIF AI Application');
      this.logger.info('================================');

      // Connect to camera
      await this.onvifService.connect();

      // Get and display device information
      await this.displayDeviceInfo();

      // Get and display capabilities
      await this.displayCapabilities();

      // Get and display stream information
      await this.displayStreamInfo();

      // Start event monitoring if enabled
      if (this.config.events.enabled) {
        await this.eventService.start();
      }

      this.isRunning = true;
      this.logger.success('Application started successfully');

    } catch (error) {
      this.logger.failure('Failed to start application', error);
      throw error;
    }
  }

  /**
   * Stop the ONVIF application
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      this.logger.warning('Application is not running');
      return;
    }

    this.logger.info('Stopping ONVIF AI Application...');

    try {
      // Stop event service
      if (this.config.events.enabled) {
        await this.eventService.stop();
      }

      // Disconnect from camera
      await this.onvifService.disconnect();

      this.isRunning = false;
      this.logger.success('Application stopped successfully');

    } catch (error) {
      this.logger.error('Error during application shutdown', error);
      throw error;
    }
  }

  /**
   * Get application status
   */
  getStatus(): {
    isRunning: boolean;
    cameraConnected: boolean;
    eventService: { isRunning: boolean; eventCount: number };
  } {
    return {
      isRunning: this.isRunning,
      cameraConnected: this.onvifService.isServiceConnected(),
      eventService: this.eventService.getStatus(),
    };
  }

  /**
   * Get ONVIF service instance for advanced usage
   */
  getONVIFService(): ONVIFService {
    return this.onvifService;
  }

  /**
   * Get event service instance for advanced usage
   */
  getEventService(): EventService {
    return this.eventService;
  }

  /**
   * Display device information
   */
  private async displayDeviceInfo(): Promise<void> {
    try {
      const info = await this.onvifService.getDeviceInformation();
      
      this.logger.info('\n📹 Camera Information:');
      this.logger.info(`- Manufacturer: ${info.manufacturer}`);
      this.logger.info(`- Model: ${info.model}`);
      this.logger.info(`- Firmware Version: ${info.firmwareVersion}`);
      this.logger.info(`- Serial Number: ${info.serialNumber}`);
      
      if (info.hardwareId) {
        this.logger.info(`- Hardware ID: ${info.hardwareId}`);
      }

    } catch (error) {
      this.logger.warning('Could not retrieve device information', error);
    }
  }

  /**
   * Display camera capabilities
   */
  private async displayCapabilities(): Promise<void> {
    try {
      const capabilities = await this.onvifService.getCapabilities();
      
      this.logger.info('\n🔧 Camera Capabilities:');
      this.logger.info(`- Analytics: ${capabilities.analytics ? '✅' : '❌'}`);
      this.logger.info(`- Device: ${capabilities.device ? '✅' : '❌'}`);
      this.logger.info(`- Events: ${capabilities.events ? '✅' : '❌'}`);
      this.logger.info(`- Imaging: ${capabilities.imaging ? '✅' : '❌'}`);
      this.logger.info(`- Media: ${capabilities.media ? '✅' : '❌'}`);
      this.logger.info(`- PTZ: ${capabilities.ptz ? '✅' : '❌'}`);

    } catch (error) {
      this.logger.warning('Could not retrieve capabilities', error);
    }
  }

  /**
   * Display stream information
   */
  private async displayStreamInfo(): Promise<void> {
    try {
      const stream = await this.onvifService.getStreamUri();
      
      this.logger.info('\n📺 Stream Information:');
      this.logger.info(`- RTSP URL: ${stream.uri}`);

    } catch (error) {
      this.logger.warning('Could not retrieve stream information', error);
    }
  }

  /**
   * Setup event handlers and orchestration
   */
  private setupEventHandlers(): void {
    // Handle all events for logging and orchestration
    this.eventService.onAnyEvent((event: ProcessedEvent) => {
      this.logger.info(`🔔 Event received: ${event.type}`, {
        topic: event.topic,
        source: event.source,
        timestamp: event.timestamp.toISOString(),
      });

      // App orchestrates what to do with events
      this.handleEvent(event);
    });

    // Specific event handlers for enhanced logging
    this.eventService.onMotionDetection((event: ProcessedEvent) => {
      this.logger.info('🚶 Motion detected!', {
        source: event.source,
        timestamp: event.timestamp.toISOString(),
      });
    });

    this.eventService.onPeopleDetection((event: ProcessedEvent) => {
      this.logger.info('👤 People detected!', {
        source: event.source,
        timestamp: event.timestamp.toISOString(),
        data: event.data
      });
    });

    this.eventService.onObjectDetection((event: ProcessedEvent) => {
      this.logger.info('🎯 Object detected!', {
        source: event.source,
        timestamp: event.timestamp.toISOString(),
        data: event.data
      });
    });

    this.eventService.onTamperingDetection((event: ProcessedEvent) => {
      this.logger.warning('⚠️ Tampering detected!', {
        source: event.source,
        timestamp: event.timestamp.toISOString(),
      });
    });

    this.eventService.onDeviceEvent((event: ProcessedEvent) => {
      this.logger.info('🔧 Device event:', {
        type: event.type,
        source: event.source,
        timestamp: event.timestamp.toISOString(),
      });
    });

    this.eventService.onError((error: Error) => {
      this.logger.error('Event service error:', error);
    });
  }

  /**
   * Handle event orchestration - decides what to do with each event
   */
  private async handleEvent(event: ProcessedEvent): Promise<void> {
    // Send alerts if alert service is configured and enabled
    if (this.alertService && this.alertService.isAlertEnabled()) {
      try {
        const deviceInfo = await this.onvifService.getDeviceInformation().catch(() => null);
        await this.alertService.sendAlert(event, deviceInfo);
      } catch (error) {
        this.logger.error('Failed to send alert', error);
      }
    }

    // Future: Add other event processors here
    // - Database logging: await this.databaseService?.saveEvent(event);
    // - Analytics processing: await this.analyticsService?.processEvent(event);
    // - Email notifications: await this.emailService?.sendNotification(event);
    // - Custom webhooks: await this.webhookService?.processEvent(event);
  }

  /**
   * Graceful shutdown handler
   */
  async gracefulShutdown(signal: string): Promise<void> {
    this.logger.info(`Received ${signal}, shutting down gracefully...`);
    
    try {
      await this.stop();
      process.exit(0);
    } catch (error) {
      this.logger.error('Error during graceful shutdown', error);
      process.exit(1);
    }
  }

  /**
   * Alert Management Methods
   */

  /**
   * Enable alert notifications
   */
  enableAlerts(): void {
    if (this.alertService) {
      this.alertService.enable();
    } else {
      this.logger.warning('Alert service not configured');
    }
  }

  /**
   * Disable alert notifications
   */
  disableAlerts(): void {
    if (this.alertService) {
      this.alertService.disable();
    } else {
      this.logger.warning('Alert service not configured');
    }
  }

  /**
   * Check if alerts are enabled
   */
  areAlertsEnabled(): boolean {
    return this.alertService?.isAlertEnabled() ?? false;
  }

  /**
   * Get alert statistics
   */
  getAlertStats(): { enabled: boolean; alertCount: number; webhookUrl: string } | null {
    return this.alertService?.getStats() ?? null;
  }

  /**
   * Test webhook connectivity
   */
  async testAlertWebhook(): Promise<boolean> {
    if (!this.alertService) {
      this.logger.warning('Alert service not configured');
      return false;
    }

    this.logger.info('🧪 Testing alert webhook...');
    
    try {
      const result = await this.alertService.testWebhook();
      
      if (result) {
        this.logger.success('✅ Alert webhook test successful');
      } else {
        this.logger.error('❌ Alert webhook test failed');
      }
      
      return result;
    } catch (error) {
      this.logger.error('Webhook test failed', error);
      return false;
    }
  }
}
