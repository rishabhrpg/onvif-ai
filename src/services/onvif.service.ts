/**
 * ONVIF AI - ONVIF Service
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

import { Cam, CamOptions, DeviceInformation, Capabilities, StreamUri, StreamOptions, SubscriptionResponse } from 'onvif';
import { promisify } from 'util';
import { Logger } from '../utils/logger';
import { CameraConfig } from '../config/camera.config';

export interface ONVIFServiceConfig extends CameraConfig {
  logger: Logger;
}

export class ONVIFService {
  private camera: Cam | null = null;
  private config: ONVIFServiceConfig;
  private logger: Logger;
  private isConnected = false;
  private subscription: SubscriptionResponse | null = null;

  constructor(config: ONVIFServiceConfig) {
    this.config = config;
    this.logger = config.logger;
  }

  /**
   * Connect to the ONVIF camera using promise wrapper
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.logger.info('Connecting to ONVIF camera...', {
        hostname: this.config.hostname,
        port: this.config.port,
      });

      const camOptions: CamOptions = {
        hostname: this.config.hostname,
        username: this.config.username,
        password: this.config.password,
        port: this.config.port,
      };

      this.camera = new Cam(camOptions, (err: Error | null) => {
        if (err) {
          this.logger.failure('Failed to connect to camera', err.message);
          reject(err);
          return;
        }

        this.isConnected = true;
        this.logger.success('Connected to ONVIF camera');
        resolve();
      });
    });
  }

  /**
   * Get device information
   */
  async getDeviceInformation(): Promise<DeviceInformation> {
    this.ensureConnected();
    
    try {
      const getDeviceInformationAsync = promisify(this.camera!.getDeviceInformation.bind(this.camera!));
      const info = await getDeviceInformationAsync() as DeviceInformation;
      
      if (!info) {
        throw new Error('No device information received');
      }
      
      this.logger.debug('Device information retrieved', info);
      return info;
    } catch (error) {
      this.logger.error('Failed to get device information', error);
      throw error;
    }
  }

  /**
   * Get camera capabilities
   */
  async getCapabilities(): Promise<Capabilities> {
    this.ensureConnected();
    
    try {
      const getCapabilitiesAsync = promisify(this.camera!.getCapabilities.bind(this.camera!));
      const capabilities = await getCapabilitiesAsync() as Capabilities;
      
      if (!capabilities) {
        throw new Error('No capabilities information received');
      }
      
      this.logger.debug('Capabilities retrieved', capabilities);
      return capabilities;
    } catch (error) {
      this.logger.error('Failed to get capabilities', error);
      throw error;
    }
  }

  /**
   * Get stream URI
   */
  async getStreamUri(options: StreamOptions = { protocol: 'RTSP' }): Promise<StreamUri> {
    this.ensureConnected();
    
    try {
      const getStreamUriAsync = promisify(this.camera!.getStreamUri.bind(this.camera!));
      const stream = await getStreamUriAsync(options) as StreamUri;
      
      if (!stream) {
        throw new Error('No stream information received');
      }
      
      this.logger.debug('Stream URI retrieved', stream);
      return stream;
    } catch (error) {
      this.logger.error('Failed to get stream URI', error);
      throw error;
    }
  }

  /**
   * Create pull-point subscription for polling events
   */
  async createPullPointSubscription(): Promise<any> {
    this.ensureConnected();

    try {
      const createPullPointAsync = promisify(this.camera!.createPullPointSubscription.bind(this.camera!));
      const subscription = await createPullPointAsync();
      
      if (!subscription) {
        throw new Error('No pull-point subscription response received');
      }
      
      this.logger.success('Pull-point subscription created', { 
        subscriptionId: subscription.subscriptionId || 'unknown'
      });
      return subscription;
    } catch (error) {
      this.logger.error('Failed to create pull-point subscription', error);
      throw error;
    }
  }

  /**
   * Pull messages from pull-point subscription
   */
  async pullMessages(messageLimit = 10, timeout = 'PT10S'): Promise<any[]> {
    this.ensureConnected();

    try {
      const pullMessagesAsync = promisify(this.camera!.pullMessages.bind(this.camera!));
      const messages = await pullMessagesAsync({ messageLimit, timeout });
      
      const events = messages || [];
      if (events.length > 0) {
        this.logger.debug(`Pulled ${events.length} event(s)`, events);
      }
      return events;
    } catch (error) {
      this.logger.error('Failed to pull messages', error);
      throw error;
    }
  }

  /**
   * Create event subscription with HTTP server endpoint for push notifications
   * Using the same method as the working test.js
   */
  async createEventSubscription(notificationEndpoint: string): Promise<SubscriptionResponse> {
    this.ensureConnected();

    try {
      // Use the simple subscribe method like the working test.js
      const subscribeAsync = promisify(this.camera!.subscribe.bind(this.camera!));
      const subscription = await subscribeAsync({
        url: notificationEndpoint
      }) as SubscriptionResponse;
      
      if (!subscription) {
        throw new Error('No subscription response received');
      }
      
      this.subscription = subscription;
      this.logger.success('Event subscription created', { 
        address: subscription.subscriptionReference?.address || notificationEndpoint
      });
      return subscription;
    } catch (error) {
      this.logger.error('Failed to create event subscription', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from events
   */
  async unsubscribeFromEvents(): Promise<void> {
    this.ensureConnected();

    if (!this.subscription) {
      this.logger.warning('No active event subscription to unsubscribe from');
      return;
    }

    try {
      const unsubscribeAsync = promisify(this.camera!.unsubscribe.bind(this.camera!));
      await unsubscribeAsync();
      this.subscription = null;
      this.logger.info('Unsubscribed from events');
    } catch (error) {
      this.logger.error('Failed to unsubscribe from events', error);
      throw error;
    }
  }

  /**
   * Check if the service is connected
   */
  isServiceConnected(): boolean {
    return this.isConnected && this.camera !== null;
  }

  /**
   * Get the raw camera instance (for advanced usage)
   */
  getRawCamera(): Cam | null {
    return this.camera;
  }

  /**
   * Disconnect from the camera
   */
  async disconnect(): Promise<void> {
    if (this.subscription) {
      try {
        await this.unsubscribeFromEvents();
      } catch (error) {
        this.logger.warning('Error during event unsubscription', error);
      }
    }

    this.camera = null;
    this.isConnected = false;
    this.logger.info('Disconnected from ONVIF camera');
  }

  /**
   * Ensure the service is connected
   */
  private ensureConnected(): void {
    if (!this.isConnected || !this.camera) {
      throw new Error('ONVIF service is not connected. Call connect() first.');
    }
  }
}
