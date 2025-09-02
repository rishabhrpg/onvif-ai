/**
 * ONVIF AI - Event Service
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
import { createServer, Server, IncomingMessage, ServerResponse } from 'http';
import { parse } from 'url';
import { ONVIFService } from './onvif.service';
import { Logger } from '../utils/logger';

export interface EventServiceConfig {
  method: 'polling' | 'push';
  polling?: {
    pullInterval: number;
    messageLimit: number;
    timeout: string;
    retryOnError: boolean;
    maxRetries: number;
  };
  push?: {
    httpServer: {
      port: number;
      host: string;
      endpoint: string;
    };
  };
  logger: Logger;
}

export interface ProcessedEvent {
  id: string;
  timestamp: Date;
  topic: string;
  source: string;
  type: string;
  data: any;
  raw: any;
}

export class EventService extends EventEmitter {
  private onvifService: ONVIFService;
  private config: EventServiceConfig;
  private logger: Logger;
  private isRunning = false;
  private httpServer: Server | null = null;
  private pullTimer: NodeJS.Timeout | null = null;
  private eventCounter = 0;
  private retryCount = 0;
  private subscriptionActive = false;

  constructor(onvifService: ONVIFService, config: EventServiceConfig) {
    super();
    this.onvifService = onvifService;
    this.config = config;
    this.logger = config.logger;
  }

  /**
   * Start event monitoring based on configured method
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warning('Event service is already running');
      return;
    }

    try {
      if (this.config.method === 'push') {
        await this.startPushMethod();
      } else {
        await this.startPollingMethod();
      }
      
      this.isRunning = true;
      this.logger.success(`Event service started with ${this.config.method} method`);
      
    } catch (error) {
      this.logger.failure('Failed to start event service', error);
      await this.cleanup();
      throw error;
    }
  }

  /**
   * Start push-based event monitoring
   */
  private async startPushMethod(): Promise<void> {
    if (!this.config.push) {
      throw new Error('Push configuration is missing');
    }

    // Start HTTP server for receiving push notifications
    await this.startHttpServer();
    
    // Create event subscription with our HTTP endpoint
    // Use a specific endpoint pattern like the working test.js
    const uniqueId = Date.now(); // unique ID for this session
    const notificationEndpoint = `http://${this.config.push.httpServer.host}:${this.config.push.httpServer.port}/events/${uniqueId}`;
    await this.onvifService.createEventSubscription(notificationEndpoint);
    
    this.logger.info('Push notifications configured', {
      endpoint: notificationEndpoint
    });
  }

  /**
   * Start polling-based event monitoring
   */
  private async startPollingMethod(): Promise<void> {
    if (!this.config.polling) {
      throw new Error('Polling configuration is missing');
    }

    // Create pull-point subscription
    await this.createPullPointSubscription();
    
    // Start polling for events
    this.startEventPolling();
    
    this.logger.info('Polling method configured', {
      interval: this.config.polling.pullInterval,
      messageLimit: this.config.polling.messageLimit,
    });
  }

  /**
   * Create pull-point subscription with retry logic
   */
  private async createPullPointSubscription(): Promise<void> {
    try {
      await this.onvifService.createPullPointSubscription();
      this.subscriptionActive = true;
      this.retryCount = 0;
    } catch (error) {
      this.subscriptionActive = false;
      this.logger.warning('Failed to create pull-point subscription - events will be disabled', error);
      
      if (!this.config.polling?.retryOnError) {
        throw error;
      }
    }
  }

  /**
   * Start polling for events
   */
  private startEventPolling(): void {
    if (!this.config.polling) return;

    this.pullTimer = setInterval(async () => {
      try {
        await this.pollForEvents();
      } catch (error) {
        this.logger.error('Error during event polling', error);
        this.emit('error', error);
      }
    }, this.config.polling.pullInterval);

    this.logger.debug('Event polling started', {
      interval: this.config.polling.pullInterval,
      messageLimit: this.config.polling.messageLimit,
    });
  }

  /**
   * Poll for events from the camera
   */
  private async pollForEvents(): Promise<void> {
    if (!this.isRunning || !this.config.polling) return;

    // Skip polling if subscription is not active
    if (!this.subscriptionActive) {
      return;
    }

    try {
      const events = await this.onvifService.pullMessages(
        this.config.polling.messageLimit,
        this.config.polling.timeout
      );

      if (events.length > 0) {
        this.logger.debug(`Received ${events.length} event(s)`);
        
        for (const event of events) {
          const processedEvent = this.processPolledEvent(event);
          this.eventCounter++;
          
          // Emit the processed event
          this.emit('event', processedEvent);
          
          // Emit specific event types for easier handling
          this.emit(processedEvent.type, processedEvent);
        }
      }

      // Reset retry count on successful poll
      this.retryCount = 0;

    } catch (error) {
      // Only handle errors if we're still running
      if (this.isRunning && this.config.polling) {
        this.retryCount++;
        
        if (this.config.polling.retryOnError && this.retryCount <= this.config.polling.maxRetries) {
          this.logger.warning(`Event polling error (attempt ${this.retryCount}/${this.config.polling.maxRetries})`, error);
          
          // Try to recreate subscription after max retries
          if (this.retryCount >= this.config.polling.maxRetries) {
            this.logger.info('Max retries reached, attempting to recreate subscription...');
            try {
              await this.createPullPointSubscription();
            } catch (subscriptionError) {
              this.logger.error('Failed to recreate subscription, disabling events', subscriptionError);
              this.subscriptionActive = false;
            }
          }
        } else {
          this.logger.error('Event polling failed, disabling events', error);
          this.subscriptionActive = false;
        }
      }
    }
  }

  /**
   * Process polled ONVIF event into a more usable format
   */
  private processPolledEvent(event: any): ProcessedEvent {
    const eventId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Extract event type from topic
    const eventType = this.extractEventType(event.topic || 'unknown');
    
    // Extract source information
    const source = this.extractPolledEventSource(event);

    const processedEvent: ProcessedEvent = {
      id: eventId,
      timestamp: new Date(),
      topic: event.topic || 'unknown',
      source: source,
      type: eventType,
      data: event.data || event.message,
      raw: event,
    };

    this.logger.debug('Polled event processed', {
      id: eventId,
      type: eventType,
      topic: event.topic,
    });

    return processedEvent;
  }

  /**
   * Extract source information from polled event
   */
  private extractPolledEventSource(event: any): string {
    if (event.source) {
      // Try to extract meaningful source identifier
      if (typeof event.source === 'object') {
        return JSON.stringify(event.source);
      }
      return String(event.source);
    }
    
    if (event.key) {
      return String(event.key);
    }
    
    return 'unknown';
  }

  /**
   * Start HTTP server to receive push notifications
   */
  private async startHttpServer(): Promise<void> {
    if (!this.config.push?.httpServer) return;

    const { port, host } = this.config.push.httpServer;

    return new Promise((resolve, reject) => {
      this.httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
        this.handleHttpRequest(req, res);
      });

      this.httpServer.on('error', (error) => {
        this.logger.error('HTTP server error', error);
        reject(error);
      });

      this.httpServer.listen(port, host, () => {
        this.logger.info(`Event HTTP server listening on ${host}:${port}`);
        resolve();
      });
    });
  }

  /**
   * Handle incoming HTTP requests (ONVIF event notifications)
   */
  private handleHttpRequest(req: IncomingMessage, res: ServerResponse): void {
    const parsedUrl = parse(req.url || '', true);
    
    // Only handle POST requests to our events endpoint (pattern: /events/*)
    if (req.method === 'POST' && parsedUrl.pathname && parsedUrl.pathname.startsWith('/events/')) {
      let body = '';
      
      req.on('data', (chunk) => {
        body += chunk.toString();
      });
      
      req.on('end', () => {
        try {
          this.logger.debug('Received event notification', { body });
          this.processEventNotification(body);
          
          // Send successful response
          res.writeHead(200, { 'Content-Type': 'text/xml' });
          res.end('<?xml version="1.0" encoding="UTF-8"?><soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"><soap:Body></soap:Body></soap:Envelope>');
        } catch (error) {
          this.logger.error('Error processing event notification', error);
          res.writeHead(500);
          res.end('Internal Server Error');
        }
      });
    } else {
      // Return 404 for other requests
      res.writeHead(404);
      res.end('Not Found');
    }
  }

  /**
   * Process ONVIF event notification
   */
  private processEventNotification(xmlBody: string): void {
    try {
      this.logger.debug('📡 RAW EVENT XML RECEIVED:', xmlBody);
      
      // Parse the SOAP/XML notification using the working approach from test.js
      const processedEvents = this.parseEventXml(xmlBody);
      
      for (const processedEvent of processedEvents) {
        this.eventCounter++;
        
        // Emit the processed event
        this.emit('event', processedEvent);
        
        // Emit specific event types for easier handling
        this.emit(processedEvent.type, processedEvent);
        
        this.logger.info(`🔔 Event received: ${processedEvent.type}`, {
          topic: processedEvent.topic,
          source: processedEvent.source,
          timestamp: processedEvent.timestamp.toISOString(),
          data: processedEvent.data
        });
      }
    } catch (error) {
      this.logger.error('Error parsing event notification', error);
    }
  }

  /**
   * Parse ONVIF event XML - improved to handle multiple events like test.js
   */
  private parseEventXml(xmlBody: string): ProcessedEvent[] {
    const events: ProcessedEvent[] = [];
    
    try {
      // Extract all NotificationMessage elements (there can be multiple in one XML)
      const notificationMessages = xmlBody.match(/<wsnt:NotificationMessage>[\s\S]*?<\/wsnt:NotificationMessage>/g) || [];
      
      for (const messageXml of notificationMessages) {
        const eventId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Extract topic
        const topicMatch = messageXml.match(/<wsnt:Topic[^>]*>(.*?)<\/wsnt:Topic>/);
        const topic = topicMatch ? topicMatch[1] : 'unknown';
        
        // Extract UTC time
        const utcTimeMatch = messageXml.match(/UtcTime="([^"]*)"/);
        const utcTime = utcTimeMatch ? utcTimeMatch[1] : new Date().toISOString();
        
        // Extract property operation
        const propertyMatch = messageXml.match(/PropertyOperation="([^"]*)"/);
        const property = propertyMatch ? propertyMatch[1] : 'unknown';
        
        // Extract source information
        const sourceItems = messageXml.match(/<tt:SimpleItem[^>]*Name="([^"]*)"[^>]*Value="([^"]*)"/g) || [];
        const sourceData: any = {};
        
        for (const item of sourceItems) {
          const nameMatch = item.match(/Name="([^"]*)"/);
          const valueMatch = item.match(/Value="([^"]*)"/);
          if (nameMatch && valueMatch) {
            sourceData[nameMatch[1]] = valueMatch[1];
          }
        }
        
        // Extract data items (IsMotion, State, etc.)
        const dataItems = messageXml.match(/<tt:Data>[\s\S]*?<\/tt:Data>/);
        let eventData: any = {};
        if (dataItems && dataItems[0]) {
          const dataSimpleItems = dataItems[0].match(/<tt:SimpleItem[^>]*Name="([^"]*)"[^>]*Value="([^"]*)"/g) || [];
          for (const item of dataSimpleItems) {
            const nameMatch = item.match(/Name="([^"]*)"/);
            const valueMatch = item.match(/Value="([^"]*)"/);
            if (nameMatch && valueMatch) {
              eventData[nameMatch[1]] = valueMatch[1];
            }
          }
        }
        
        // Extract event type from topic
        const eventType = this.extractEventType(topic);

        const processedEvent: ProcessedEvent = {
          id: eventId,
          timestamp: new Date(utcTime),
          topic: topic,
          source: JSON.stringify(sourceData),
          type: eventType,
          data: eventData,
          raw: messageXml,
        };

        events.push(processedEvent);
        
        this.logger.debug('Parsed event', {
          id: eventId,
          topic: topic,
          type: eventType,
          property: property,
          data: eventData
        });
      }
      
      return events;
    } catch (error) {
      this.logger.error('Error parsing event XML', error);
      return [];
    }
  }

  /**
   * Stop event monitoring
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      this.logger.warning('Event service is not running');
      return;
    }

    this.isRunning = false;
    await this.cleanup();
    this.logger.info('Event service stopped');
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
    // Stop polling timer
    if (this.pullTimer) {
      clearInterval(this.pullTimer);
      this.pullTimer = null;
      this.logger.info('Event polling stopped');
    }

    // Stop HTTP server
    if (this.httpServer) {
      return new Promise((resolve) => {
        this.httpServer!.close(() => {
          this.logger.info('Event HTTP server stopped');
          this.httpServer = null;
          resolve();
        });
      });
    }

    // Unsubscribe from events
    try {
      await this.onvifService.unsubscribeFromEvents();
    } catch (error) {
      this.logger.warning('Error during event unsubscription', error);
    }
  }

  /**
   * Get current status
   */
  getStatus(): { isRunning: boolean; eventCount: number } {
    return {
      isRunning: this.isRunning,
      eventCount: this.eventCounter,
    };
  }



  /**
   * Extract event type from topic string
   */
  private extractEventType(topic: string): string {
    // Common ONVIF event topics:
    // tns1:VideoSource/MotionAlarm
    // tns1:Device/HardwareFailure
    // tns1:Recording/JobState
    // tns1:VideoAnalytics/ObjectDetection
    // tns1:Analytics/PeopleDetection
    // tns1:VideoSource/HumanDetection
    
    if (!topic) return 'unknown';
    
    const parts = topic.split('/');
    if (parts.length >= 2) {
      const lastPart = parts[parts.length - 1];
      
      // Handle specific people detection patterns
      if (lastPart.toLowerCase().includes('people') || 
          lastPart.toLowerCase().includes('human') ||
          lastPart.toLowerCase().includes('person')) {
        return 'peopledetection';
      }
      
      // Handle object detection that might include people
      if (lastPart.toLowerCase().includes('object') && 
          topic.toLowerCase().includes('analytics')) {
        return 'objectdetection';
      }
      
      // Convert to lowercase and remove special characters
      return lastPart.toLowerCase().replace(/[^a-z0-9]/g, '_');
    }
    
    return topic.toLowerCase().replace(/[^a-z0-9]/g, '_');
  }



  /**
   * Register event handlers for specific event types
   */
  onMotionDetection(handler: (event: ProcessedEvent) => void): void {
    this.on('motionalarm', handler);
  }

  onTamperingDetection(handler: (event: ProcessedEvent) => void): void {
    this.on('tamper', handler);
  }

  onPeopleDetection(handler: (event: ProcessedEvent) => void): void {
    this.on('peopledetection', handler);
  }

  onObjectDetection(handler: (event: ProcessedEvent) => void): void {
    this.on('objectdetection', handler);
  }

  onDeviceEvent(handler: (event: ProcessedEvent) => void): void {
    this.on('device', handler);
  }

  onRecordingEvent(handler: (event: ProcessedEvent) => void): void {
    this.on('recording', handler);
  }

  onAnyEvent(handler: (event: ProcessedEvent) => void): void {
    this.on('event', handler);
  }

  onError(handler: (error: Error) => void): void {
    this.on('error', handler);
  }
}
