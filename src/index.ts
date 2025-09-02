/**
 * ONVIF AI - Entry Point
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

import { ONVIFApp } from './app';
import { loadConfig } from './config/camera.config';

async function main(): Promise<void> {
  // Load configuration
  const config = loadConfig();
  
  // Create application instance
  const app = new ONVIFApp(config);
  
  // Setup graceful shutdown handlers
  process.on('SIGTERM', () => app.gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => app.gracefulShutdown('SIGINT'));
  
  try {
    // Start the application
    await app.start();
    
    // Keep the application running
    console.log('\n📡 Application is running. Press Ctrl+C to stop.');
    
    // Optional: Display status periodically
    setInterval(() => {
      const status = app.getStatus();
      if (status.eventService.eventCount > 0) {
        console.log(`\n📊 Status: Camera Connected: ${status.cameraConnected}, Events Received: ${status.eventService.eventCount}`);
      }
    }, 30000); // Every 30 seconds
    
  } catch (error) {
    console.error('Application failed to start:', error);
    process.exit(1);
  }
}

// Run the application
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
