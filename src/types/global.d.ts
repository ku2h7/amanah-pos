// Type definitions for Web Serial API
declare global {
  interface Navigator {
    serial: {
      requestPort: () => Promise<SerialPort>;
      getPorts: () => Promise<SerialPort[]>;
    };
  }

  interface SerialPort extends EventTarget {
    open: (options: SerialOptions) => Promise<void>;
    close: () => Promise<void>;
    readonly readable: ReadableStream<Uint8Array> | null;
    readonly writable: WritableStream<Uint8Array> | null;
  }

  interface SerialOptions {
    baudRate: number;
    dataBits?: number;
    stopBits?: number;
    parity?: 'none' | 'even' | 'odd';
    bufferSize?: number;
    flowControl?: 'none' | 'hardware';
  }
}

export {};
