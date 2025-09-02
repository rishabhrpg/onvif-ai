# ONVIF AI - IP Camera Integration with AI Event Detection

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-blue.svg)](https://www.typescriptlang.org/)

A professional Node.js TypeScript application for integrating with ONVIF-compliant IP cameras, featuring AI-powered event detection, real-time notifications, and webhook alerts.

## 🚀 Features

- **📹 ONVIF Camera Integration** - Connect to any ONVIF-compliant IP camera
- **🤖 AI Event Detection** - Motion, people, object, and tampering detection
- **⚡ Real-time Events** - Push notifications and polling modes
- **🚨 Smart Alerting** - Webhook notifications with throttling and debouncing
- **🔧 TypeScript** - Full type safety and modern development experience
- **📊 Comprehensive Logging** - Detailed event and error logging
- **🛡️ Error Handling** - Robust error handling and retry logic

## 📋 Requirements

- **Node.js** 18.0 or higher
- **TypeScript** 5.0 or higher  
- **ONVIF-compliant IP Camera**
- **Network access** to camera and webhook endpoints

## 🛠️ Installation

### Clone Repository

```bash
git clone https://github.com/rishabhrpg/onvif-ai.git
cd onvif-ai
```

### Install Dependencies

```bash
npm install
```

### Environment Setup

Copy the example environment file and configure your settings:

```bash
cp .env.example .env
```

Edit `.env` with your camera and webhook settings:

```bash
# ONVIF Camera Configuration
CAMERA_HOST=192.168.1.100
CAMERA_PORT=80
CAMERA_USERNAME=admin
CAMERA_PASSWORD=your_password

# Alert Configuration  
ALERTS_ENABLED=true
ALERTS_WEBHOOK_URL=https://your-webhook-endpoint.com/alerts
```

### Build and Run

```bash
# Build the application
npm run build

# Run the application
npm start

# Or run in development mode
npm run dev
```

## 🎯 Quick Start

```javascript
import { ONVIFApp } from './src/app';
import { loadConfig } from './src/config/camera.config';

async function main() {
  // Load configuration from environment variables
  const config = loadConfig();
  
  // Create and start the application
  const app = new ONVIFApp(config);
  await app.start();
  
  // The app will now:
  // 1. Connect to your ONVIF camera
  // 2. Start monitoring for events
  // 3. Send webhook alerts when events occur
}

main().catch(console.error);
```

## 📖 Configuration

### Camera Settings

```bash
# ONVIF Camera Configuration
CAMERA_HOST=192.168.1.100          # Camera IP address
CAMERA_PORT=80                     # ONVIF port (usually 80, 8080, or 554)
CAMERA_USERNAME=admin              # Camera username
CAMERA_PASSWORD=password123        # Camera password
CAMERA_TIMEOUT=30000              # Connection timeout in milliseconds
```

### Event Monitoring

```bash
# Event Configuration
EVENTS_ENABLED=true               # Enable/disable event monitoring
EVENT_METHOD=push                 # 'push' or 'polling'

# Push Method (Real-time)
PUSH_HTTP_PORT=3001              # Port for receiving push notifications
PUSH_HTTP_HOST=192.168.1.100     # Host address for push server
PUSH_HTTP_ENDPOINT=/events       # Endpoint path for events

# Polling Method (Fallback)
POLLING_PULL_INTERVAL=5000       # Polling interval in milliseconds
POLLING_MESSAGE_LIMIT=10         # Max messages per poll
POLLING_TIMEOUT=PT10S            # Polling timeout (ISO 8601 duration)
POLLING_RETRY_ON_ERROR=true      # Retry on polling errors
POLLING_MAX_RETRIES=3            # Max retry attempts
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
- **People Detection** - `peopledetection` 
- **Object Detection** - `objectdetection`
- **Tampering Detection** - `tamper`
- **Device Events** - `device`
- **Recording Events** - `recording`
- **Custom Events** - Based on camera capabilities

## 🚨 Alert Module

The Alert Module provides webhook-based notifications for camera events. When enabled, it automatically sends HTTP POST requests to your configured webhook URL whenever events are detected.

### Features

- **Webhook Notifications**: HTTP POST requests to your endpoint
- **Event Filtering**: Automatic severity classification
- **Retry Logic**: Configurable retry attempts with delays
- **Enable/Disable**: Runtime control of alert functionality
- **Rich Payloads**: Detailed event information and camera context
- **🎛️ Smart Throttling**: Prevent alert spam with configurable throttling

### Configuration

Add these environment variables to your `.env` file:

```bash
# Alert Configuration
ALERTS_ENABLED=true
ALERTS_WEBHOOK_URL=https://your-webhook-endpoint.com/alerts
ALERTS_TIMEOUT=5000
ALERTS_RETRY_ATTEMPTS=3
ALERTS_RETRY_DELAY=1000

# Alert Throttling Configuration
ALERTS_THROTTLING_ENABLED=true
ALERTS_THROTTLING_WINDOW_MS=60000
ALERTS_THROTTLING_MAX_PER_WINDOW=5
ALERTS_THROTTLING_DEBOUNCE_MS=5000
```

### 🎛️ Alert Throttling

Alert throttling prevents webhook spam by implementing two mechanisms:

#### **Rate Limiting**
- **Window-based**: Limits alerts per time window (e.g., max 5 alerts per minute)
- **Per Event Type**: Each event type (motion, people, etc.) has its own limit
- **Automatic Reset**: Counters reset when the time window expires

#### **Debouncing**
- **Minimum Interval**: Enforces minimum time between alerts of the same type
- **Spam Prevention**: Prevents rapid-fire alerts from the same event
- **Smart Timing**: Uses configurable debounce period

### Throttling Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `ALERTS_THROTTLING_ENABLED` | `true` | Enable/disable throttling |
| `ALERTS_THROTTLING_WINDOW_MS` | `60000` | Time window for rate limiting (1 minute) |
| `ALERTS_THROTTLING_MAX_PER_WINDOW` | `5` | Max alerts per window per event type |
| `ALERTS_THROTTLING_DEBOUNCE_MS` | `5000` | Minimum time between same-type alerts (5 seconds) |

### Throttling Examples

```bash
# Conservative: Reduce alert frequency
ALERTS_THROTTLING_WINDOW_MS=300000      # 5 minute window
ALERTS_THROTTLING_MAX_PER_WINDOW=3      # Max 3 alerts per 5 minutes
ALERTS_THROTTLING_DEBOUNCE_MS=10000     # 10 second debounce

# Aggressive: Allow more alerts
ALERTS_THROTTLING_WINDOW_MS=30000       # 30 second window  
ALERTS_THROTTLING_MAX_PER_WINDOW=10     # Max 10 alerts per 30 seconds
ALERTS_THROTTLING_DEBOUNCE_MS=2000      # 2 second debounce

# Disabled: No throttling (not recommended)
ALERTS_THROTTLING_ENABLED=false
```

### Webhook Payload

When an event is detected, the following JSON payload is sent to your webhook:

```json
{
  "eventId": "evt_1704067200000_abc123",
  "eventType": "peopledetection",
  "timestamp": "2025-01-01T12:00:00.000Z",
  "topic": "tns1:VideoAnalytics/PeopleDetection",
  "source": "{\"VideoSourceConfigurationToken\":\"1\"}",
  "data": {
    "State": "true",
    "Confidence": "0.95"
  },
  "cameraInfo": {
    "hostname": "192.168.1.100",
    "model": "DS-2CD2143G0-IS",
    "manufacturer": "Hikvision"
  },
  "severity": "high",
  "message": "👤 Person detected at 1/1/2025, 12:00:00 PM"
}
```

### Severity Levels

| Event Type | Severity | Description |
|------------|----------|-------------|
| `peopledetection` | `high` | Person detected by AI |
| `tamper` | `critical` | Camera tampering detected |
| `motionalarm` | `medium` | Motion detected |
| `objectdetection` | `medium` | Object detected by AI |
| `device` | `low` | Device status events |

### Usage Examples

```javascript
// Enable/disable alerts at runtime
app.enableAlerts();
app.disableAlerts();

// Check alert status
const isEnabled = app.areAlertsEnabled();
console.log('Alerts enabled:', isEnabled);

// Get alert statistics (includes throttling info)
const stats = app.getAlertStats();
console.log('Alert stats:', stats);
// Output: { 
//   enabled: true, 
//   alertCount: 15, 
//   webhookUrl: "https://***",
//   throttling: {
//     enabled: true,
//     windowMs: 60000,
//     maxAlertsPerWindow: 5,
//     debounceMs: 5000,
//     eventTypes: {
//       "peopledetection": { count: 2, windowRemainingMs: 45000, ... }
//     }
//   }
// }

// Test webhook connectivity
const testResult = await app.testAlertWebhook();
console.log('Webhook test:', testResult ? 'PASSED' : 'FAILED');
```

### Webhook Examples

#### Discord Webhook
```bash
ALERTS_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_TOKEN
```

#### Slack Webhook
```bash
ALERTS_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
```

#### Custom API Endpoint
```bash
ALERTS_WEBHOOK_URL=https://api.yourdomain.com/camera-alerts
```

### Error Handling

- **Connection Timeouts**: Configurable timeout (default: 5 seconds)
- **Retry Logic**: Automatic retries with exponential backoff
- **Graceful Failures**: Alerts failures don't affect event monitoring
- **Detailed Logging**: All webhook attempts are logged
- **Throttle Logging**: Throttled alerts are logged for debugging

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
- `onPeopleDetection(handler)` - Handle people detection events
- `onObjectDetection(handler)` - Handle object detection events
- `onTamperingDetection(handler)` - Handle tampering events
- `onAnyEvent(handler)` - Handle all events
- `getStatus()` - Get service status

### ONVIFApp

- `start()` - Start the application
- `stop()` - Stop the application
- `enableAlerts()` - Enable alert notifications
- `disableAlerts()` - Disable alert notifications
- `areAlertsEnabled()` - Check if alerts are enabled
- `getAlertStats()` - Get alert statistics with throttling info
- `testAlertWebhook()` - Test webhook connectivity
- `getStatus()` - Get application status

## 🔧 Advanced Usage

### Custom Event Handlers

```javascript
import { ONVIFApp } from './src/app';
import { loadConfig } from './src/config/camera.config';

const config = loadConfig();
const app = new ONVIFApp(config);

// Get event service for custom handlers
const eventService = app.getEventService();

// Handle specific event types
eventService.onPeopleDetection((event) => {
  console.log('👤 Person detected:', {
    timestamp: event.timestamp,
    confidence: event.data.Confidence,
    location: event.source
  });
});

eventService.onMotionDetection((event) => {
  console.log('🚶 Motion detected:', event);
});

// Handle all events
eventService.onAnyEvent((event) => {
  console.log('📡 Event:', event.type, event.timestamp);
});

await app.start();
```

### Advanced ONVIF Operations

```javascript
// Get ONVIF service for advanced operations
const onvifService = app.getONVIFService();

// Get device information
const deviceInfo = await onvifService.getDeviceInformation();
console.log('Camera:', deviceInfo.manufacturer, deviceInfo.model);

// Get stream URI
const stream = await onvifService.getStreamUri();
console.log('RTSP Stream:', stream.uri);

// Get camera capabilities
const capabilities = await onvifService.getCapabilities();
console.log('Supports Analytics:', capabilities.analytics);
```

## 🚨 Troubleshooting

### Connection Issues

1. **Verify camera IP and port**
   ```bash
   ping 192.168.1.100
   telnet 192.168.1.100 80
   ```

2. **Check ONVIF support**
   - Access camera web interface
   - Look for ONVIF settings
   - Ensure ONVIF is enabled

3. **Test credentials**
   - Use ONVIF Device Manager
   - Verify username/password work

### Event Issues

1. **No events received**
   - Check camera event configuration
   - Verify event types are enabled
   - Test with polling mode first

2. **Push notifications not working**
   - Ensure port is accessible
   - Check firewall settings
   - Verify camera can reach n8n server

3. **Too many alerts (Alert Spam)**
   - Enable throttling: `ALERTS_THROTTLING_ENABLED=true`
   - Adjust window: `ALERTS_THROTTLING_WINDOW_MS=60000`
   - Reduce max alerts: `ALERTS_THROTTLING_MAX_PER_WINDOW=3`
   - Increase debounce: `ALERTS_THROTTLING_DEBOUNCE_MS=10000`

### Performance Issues

1. **High CPU usage**
   - Increase polling interval
   - Reduce event types monitored
   - Use push mode instead of polling

2. **Network congestion**
   - Optimize polling frequency
   - Filter unnecessary event types
   - Enable alert throttling

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   ONVIF Camera  │───▶│  ONVIF Service  │───▶│  Event Service  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Webhook API   │◀───│  Alert Service  │◀───│   ONVIF App     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Extending the Application

The modular architecture makes it easy to extend functionality:

```javascript
// Add custom event processors in app.ts
private async handleEvent(event: ProcessedEvent): Promise<void> {
  // Send alerts
  if (this.alertService?.isAlertEnabled()) {
    await this.alertService.sendAlert(event, deviceInfo);
  }
  
  // Add your custom processors
  await this.databaseService?.saveEvent(event);
  await this.analyticsService?.processEvent(event);
  await this.emailService?.sendNotification(event);
}
```

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
