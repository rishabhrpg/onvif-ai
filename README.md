# ONVIF AI - Advanced IP Camera Connection

A professional Node.js TypeScript application for connecting to ONVIF-compatible IP cameras with promise-based API, event handling, and comprehensive logging.

## Features

- 🎥 **Promise-based ONVIF API** - Clean async/await syntax using util.promisify
- 📋 **Device Information** - Get manufacturer, model, firmware details
- 📺 **RTSP Stream URLs** - Retrieve video stream endpoints
- 🔔 **Dual Event Methods** - Both polling and push-based event handling with toggle support
- 📊 **Professional Logging** - Structured logging with timestamps
- ⚙️ **Configuration Management** - Environment variable support
- 🏗️ **Modular Architecture** - Clean separation of concerns
- 🔧 **TypeScript Support** - Full type safety and IntelliSense
- 🛡️ **Error Handling** - Robust error handling and validation
- 🎛️ **Graceful Shutdown** - Clean application termination
- 🌐 **HTTP Event Server** - Mini HTTP server for ONVIF event push notifications
- ⚡ **High Performance** - No polling, events pushed directly from camera

## Architecture

```
src/
├── app.ts                 # Main application orchestrator
├── index.ts              # Application entry point
├── config/
│   └── camera.config.ts  # Configuration management
├── services/
│   ├── onvif.service.ts  # Promise-based ONVIF wrapper
│   └── event.service.ts  # Event handling and processing
├── utils/
│   └── logger.ts         # Structured logging utility
├── types/
│   └── onvif.d.ts       # TypeScript declarations
└── examples/
    └── basic-usage.ts   # Usage examples
```

## Prerequisites

- Node.js (v16 or higher)
- An ONVIF-compatible IP camera on your network
- Camera credentials (username/password)

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure your camera:**
   ```bash
   # Copy the example environment file
   cp .env.example .env
   
   # Edit .env with your camera settings
   nano .env
   ```
   
   Update the `.env` file with your camera details:
   ```env
   # ONVIF Camera Configuration
   CAMERA_HOST=192.168.1.100
   CAMERA_PORT=2020
   CAMERA_USERNAME=admin
   CAMERA_PASSWORD=your_password
   CAMERA_TIMEOUT=10000

   # Event Configuration
   EVENTS_ENABLED=true
   EVENT_METHOD=push

   # Polling Configuration (for EVENT_METHOD=polling)
   POLLING_PULL_INTERVAL=5000
   POLLING_MESSAGE_LIMIT=10
   POLLING_TIMEOUT=PT10S
   POLLING_RETRY_ON_ERROR=true
   POLLING_MAX_RETRIES=3

   # Push Configuration (for EVENT_METHOD=push)
   PUSH_HTTP_PORT=3001
   PUSH_HTTP_HOST=192.168.1.100
   PUSH_HTTP_ENDPOINT=/events

   # Logging Configuration
   LOG_LEVEL=info
   LOG_ENABLE_TIMESTAMPS=true
   ```

3. **Run in development mode:**
   ```bash
   npm run dev
   ```

4. **Build and run production:**
   ```bash
   npm run build
   npm start
   ```

## Scripts

- `npm run dev` - Run with ts-node for development
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run the compiled JavaScript
- `npm run clean` - Remove the dist directory

## Configuration

### Environment Variables (.env file)

All configuration is now managed through a `.env` file in the project root. Copy `.env.example` to `.env` and customize:

```env
# ONVIF Camera Configuration
CAMERA_HOST=192.168.1.100
CAMERA_PORT=2020
CAMERA_USERNAME=admin
CAMERA_PASSWORD=your_password
CAMERA_TIMEOUT=10000

# Event Configuration
EVENTS_ENABLED=true
EVENT_METHOD=push

# Polling Configuration (for EVENT_METHOD=polling)
POLLING_PULL_INTERVAL=5000
POLLING_MESSAGE_LIMIT=10
POLLING_TIMEOUT=PT10S
POLLING_RETRY_ON_ERROR=true
POLLING_MAX_RETRIES=3

# Push Configuration (for EVENT_METHOD=push)
PUSH_HTTP_PORT=3001
PUSH_HTTP_HOST=192.168.1.100
PUSH_HTTP_ENDPOINT=/events

# Logging Configuration
LOG_LEVEL=info
LOG_ENABLE_TIMESTAMPS=true
```

You can still override any setting using command-line environment variables:
```bash
EVENT_METHOD=polling npm run dev
```

### Configuration Options

```typescript
interface AppConfig {
  camera: {
    hostname: string;    // Camera IP address
    username: string;    // Camera username
    password: string;    // Camera password
    port: number;        // Camera port (usually 80 or 8080)
    timeout?: number;    // Connection timeout in ms
  };
  events: {
    enabled: boolean;     // Enable/disable event monitoring
    method: 'polling' | 'push'; // Event method selection
    polling: {
      pullInterval: number; // Polling interval in ms
      messageLimit: number; // Max events per poll
      timeout: string;      // Event timeout (ISO 8601 format)
      retryOnError: boolean;// Retry on errors
      maxRetries: number;   // Maximum retry attempts
    };
    push: {
      httpServer: {
        port: number;       // HTTP server port for notifications
        host: string;       // Host to bind server to
        endpoint: string;   // Endpoint path for receiving events
      };
    };
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error'; // Log level
    enableTimestamps: boolean;                   // Include timestamps
  };
}
```

## Usage Examples

### Basic Usage

```typescript
import { ONVIFApp } from './src/app';
import { loadConfig } from './src/config/camera.config';

const config = loadConfig();
const app = new ONVIFApp(config);

await app.start();
```

### Advanced Usage

```typescript
import { ONVIFService } from './src/services/onvif.service';
import { EventService } from './src/services/event.service';
import { Logger } from './src/utils/logger';

// Create logger
const logger = new Logger({ level: 'info', enableTimestamps: true });

// Create ONVIF service
const onvifService = new ONVIFService({
  hostname: '192.168.1.100',
  username: 'admin',
  password: 'password',
  port: 80,
  logger
});

// Connect to camera
await onvifService.connect();

// Get device information
const deviceInfo = await onvifService.getDeviceInformation();
console.log('Device:', deviceInfo);

// Get stream URI
const stream = await onvifService.getStreamUri();
console.log('Stream URL:', stream.uri);

    // Setup event handling
    const eventService = new EventService(onvifService, {
      method: 'polling', // or 'push'
      polling: {
        pullInterval: 5000,
        messageLimit: 10,
        timeout: 'PT10S',
        retryOnError: true,
        maxRetries: 3,
      },
      push: {
        httpServer: {
          port: 3001,
          host: '0.0.0.0',
          endpoint: '/onvif/events',
        },
      },
      logger
    });

// Handle motion events
eventService.onMotionDetection((event) => {
  console.log('Motion detected!', event.timestamp);
});

// Start event monitoring
await eventService.start();
```

## Event Methods

The application supports two event handling methods:

### 🔄 Polling Method (Default)
- **Pull-Point Subscription**: Creates a pull-point subscription with the camera
- **Active Polling**: Application polls the camera for events at regular intervals
- **Retry Logic**: Automatic retry and subscription recreation on failures
- **Compatibility**: Works with most ONVIF cameras
- **Use Case**: Reliable for cameras with basic ONVIF support

```bash
# Use polling method (default)
npm run dev
# or explicitly
EVENT_METHOD=polling npm run dev
```

### 📡 Push Method
- **HTTP Server**: Mini HTTP server receives push notifications
- **Real-time**: Events pushed directly from camera when they occur
- **Zero Polling**: No polling overhead, instant notifications
- **Requirements**: Camera must be able to reach your server
- **Use Case**: Best performance for cameras with full ONVIF support

```bash
# Use push method
EVENT_METHOD=push npm run dev
```

## Event Types

The application can handle various ONVIF events:

- **Motion Detection** - `motionalarm`
- **Tampering Detection** - `tamper`
- **Device Events** - `device`
- **Recording Events** - `recording`
- **Custom Events** - Based on camera capabilities

## API Reference

### ONVIFService

- `connect()` - Connect to camera
- `getDeviceInformation()` - Get device details
- `getCapabilities()` - Get camera capabilities
- `getStreamUri(options?)` - Get RTSP stream URL
- `createEventSubscription()` - Create event subscription
- `pullMessages(limit?, timeout?)` - Pull event messages
- `disconnect()` - Disconnect from camera

### EventService

- `start()` - Start event monitoring
- `stop()` - Stop event monitoring
- `onMotionDetection(handler)` - Handle motion events
- `onTamperingDetection(handler)` - Handle tampering events
- `onAnyEvent(handler)` - Handle all events

## Finding Your Camera

To find ONVIF cameras on your network:

1. **ONVIF Device Manager** (Windows)
2. **IP Camera Scanner apps** (Mobile)
3. **Network scanning tools** (nmap, etc.)
4. **Router admin panel** (check connected devices)

Common camera settings:
- Port 80 or 8080 for HTTP
- Port 554 for RTSP streams
- Default credentials: admin/admin, admin/password

## Troubleshooting

### Connection Issues
- Ensure camera supports ONVIF protocol
- Verify IP address, port, and credentials
- Check network connectivity
- Some cameras require enabling ONVIF in settings

### Event Issues
- Not all cameras support ONVIF events
- Some cameras have limited event types
- **Polling method**: May get connection resets (normal behavior)
- **Push method**: Camera must be able to reach your server's IP address
- **Push method**: Ensure the HTTP server port is accessible to the camera

### Performance
- **Polling**: Reliable but with regular polling overhead
- **Push**: Zero polling overhead, real-time notifications
- **Push**: HTTP server handles multiple concurrent event notifications
- Use appropriate log levels in production
- Choose method based on your camera's ONVIF support level

## Security Considerations

- Change default camera passwords
- Use strong authentication credentials
- Consider network segmentation for cameras
- Keep camera firmware updated
- Monitor for unauthorized access

## Recent Improvements

### ✅ Version 2.0 Updates

- **🔄 Promise-based API**: Converted from callback-based to clean async/await syntax using `util.promisify`
- **🌐 Dual Event Methods**: Support for both polling and push-based event handling
- **🔀 Method Toggle**: Easy switching between polling and push methods via configuration
- **📡 HTTP Event Server**: Mini HTTP server for push notifications
- **🔁 Robust Polling**: Pull-point subscriptions with retry logic and auto-recovery
- **🧹 Code Cleanup**: Removed callback clutter and simplified codebase significantly
- **🔧 Better Error Handling**: Improved type safety and error validation
- **⚙️ Flexible Config**: Environment variable support for method selection

### Event System Architecture

**Polling Method (Default):**
```
Your App → Pull-Point Subscription → Camera
Your App ← Poll for Events (5s interval) ← Camera
```

**Push Method:**
```
Camera → HTTP POST → Your HTTP Server → Event Processing → Event Handlers
                     (localhost:3001)
```

### Method Comparison

| Feature | Polling | Push |
|---------|---------|------|
| **Compatibility** | ✅ Most cameras | ⚠️ Full ONVIF support needed |
| **Performance** | ⚠️ Regular polling overhead | ✅ Zero polling, real-time |
| **Reliability** | ✅ Works with connection resets | ⚠️ Requires network accessibility |
| **Setup** | ✅ Simple, works out of the box | ⚠️ Firewall/network configuration |
| **Use Case** | Basic ONVIF cameras | Advanced ONVIF cameras |

## Next Steps

Extend this foundation to:
- **AI Integration** - Add computer vision processing on RTSP streams
- **PTZ Control** - Implement pan-tilt-zoom functions
- **Snapshot Capture** - Take still images via ONVIF
- **Video Recording** - Record RTSP streams with FFmpeg
- **Web Interface** - Create a management dashboard
- **Database Integration** - Store events and metadata
- **Alerting System** - Send notifications for events (email, SMS, webhooks)
- **Multi-camera Support** - Manage multiple cameras with load balancing

## 📄 License

This project is licensed under the MIT License - see below for details.

### MIT License

```
MIT License

Copyright (c) 2025 Rishabh Gusain <r.gausai@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 🙏 Attribution

This project uses the following open source libraries:
- **onvif** - ONVIF camera communication
- **TypeScript** - Type-safe JavaScript development
- **Node.js** - JavaScript runtime environment

---

**Built with ❤️ for the home automation and security community**
