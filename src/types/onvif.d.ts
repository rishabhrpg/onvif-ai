declare module 'onvif' {
  export interface CamOptions {
    hostname: string;
    username: string;
    password: string;
    port?: number;
  }

  export interface DeviceInformation {
    manufacturer: string;
    model: string;
    firmwareVersion: string;
    serialNumber: string;
    hardwareId?: string;
  }

  export interface Capabilities {
    analytics?: boolean;
    device?: boolean;
    events?: boolean;
    imaging?: boolean;
    media?: boolean;
    ptz?: boolean;
  }

  export interface StreamUri {
    uri: string;
  }

  export interface StreamOptions {
    stream?: string;
    protocol?: string;
  }

  export interface EventProperties {
    wsSubscriptionPolicy?: any;
  }

  export interface Event {
    topic: string;
    message: any;
    key?: string;
    source?: any;
    data?: any;
  }

  export interface SubscriptionResponse {
    subscriptionReference: {
      address: string;
    };
  }

  export class Cam {
    constructor(options: CamOptions, callback?: (err: Error | null) => void);
    
    username: string;
    password: string;
    hostname: string;
    port: number;
    
    // Callback-based methods that we'll promisify
    getDeviceInformation(callback: (err: Error | null, info?: DeviceInformation) => void): void;
    getCapabilities(callback: (err: Error | null, capabilities?: Capabilities) => void): void;
    getStreamUri(options: StreamOptions, callback: (err: Error | null, stream?: StreamUri) => void): void;
    
    // Event methods
    getEventProperties(callback: (err: Error | null, properties?: EventProperties) => void): void;
    
    // Pull-point subscription methods
    createPullPointSubscription(callback: (err: Error | null, subscription?: any) => void): void;
    pullMessages(options: { messageLimit?: number; timeout?: string }, callback: (err: Error | null, messages?: any[]) => void): void;
    
    // Base subscription methods  
    subscribe(options: { 
      url: string;
    }, callback: (err: Error | null, subscription?: SubscriptionResponse) => void): void;
    unsubscribe(callback: (err: Error | null) => void): void;
    renew(options: {}, callback: (err: Error | null, data?: any) => void): void;
  }
}
