/**
 * Basic usage example of the ONVIF AI application
 */

/**
 * ONVIF AI - Basic Usage Example
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

import { ONVIFApp } from '../app';
import { loadConfig } from '../config/camera.config';

async function basicExample(): Promise<void> {
  // Configuration is now loaded from .env file
  // Create a .env file in the project root with your camera settings
  // See .env.example for all available options
  const config = loadConfig();
  
  // You can still override specific settings if needed
  config.logging.level = 'debug'; // Enable debug logging for this example
  config.events.method = 'push';  // Ensure push method for this example

  const app = new ONVIFApp(config);

  try {
    // Start the application
    await app.start();

    // Get services for advanced usage
    const onvifService = app.getONVIFService();
    const eventService = app.getEventService();

    // Example: Get device info manually
    const deviceInfo = await onvifService.getDeviceInformation();
    console.log('Device:', deviceInfo);

    // Example: Setup custom event handlers
    eventService.onMotionDetection((event) => {
      console.log('🚶 Custom motion handler:', event.timestamp);
    });

    // Example: Setup people detection handler
    eventService.onPeopleDetection((event) => {
      console.log('👤 People detected:', {
        timestamp: event.timestamp,
        source: event.source,
        data: event.data
      });
    });

    // Example: Setup object detection handler (may include people)
    eventService.onObjectDetection((event) => {
      console.log('🎯 Object detected:', {
        timestamp: event.timestamp,
        topic: event.topic,
        data: event.data
      });
    });

    // Example: Get stream URI
    const stream = await onvifService.getStreamUri();
    console.log('Stream URL:', stream.uri);

    // Keep running for 1 minute, then stop
    setTimeout(async () => {
      console.log('Stopping application...');
      await app.stop();
      process.exit(0);
    }, 60000);

  } catch (error) {
    console.error('Example failed:', error);
    process.exit(1);
  }
}

basicExample();
