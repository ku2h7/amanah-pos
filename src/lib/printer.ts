// Check if Web Serial API is available
const isWebSerialAPISupported = 'serial' in navigator;

// Common USB vendor IDs for receipt printers
const PRINTER_VENDOR_IDS = {
  CH340: 0x1A86,    // Common CH340/341 chipset
  PROLIFIC: 0x067B, // Prolific
  FTDI: 0x0403,     // FTDI
  CH340_ALT: 0x1A2C // CH340 (alternative ID)
};

// ESC/POS commands for Xprinter XP-5811Z cash drawer
export const CASH_DRAWER_COMMANDS = {
  // Standard command for Xprinter (pin 2)
  PIN2: new Uint8Array([0x1B, 0x70, 0x00, 0x19, 0xFA]),
  // Alternative command for Xprinter (pin 5)
  PIN5: new Uint8Array([0x1B, 0x70, 0x01, 0x19, 0xFA]),
  // Common Xprinter command 1
  XPRINTER1: new Uint8Array([0x1B, 0x70, 0x00, 0x30, 0x30]),
  // Common Xprinter command 2 (with longer pulse)
  XPRINTER2: new Uint8Array([0x1B, 0x70, 0x00, 0x60, 0x60]),
  // Direct command for Xprinter
  XPRINTER_DIRECT: new Uint8Array([0x10, 0x14, 0x00, 0x00, 0x00])
};

/**
 * Opens the cash drawer using Web Serial API
 * @param pin The pin number the cash drawer is connected to (2 or 5)
 * @returns Promise<boolean> - Whether the command was sent successfully
 */
// Store the port globally
let currentPort: any = null;

export async function openCashDrawer(pin: 2 | 5 = 2): Promise<boolean> {
  if (!isWebSerialAPISupported) {
    console.warn('Web Serial API not supported in this browser');
    return false;
  }

  if (!window.isSecureContext) {
    console.warn('Web Serial API requires a secure context (HTTPS or localhost)');
    return false;
  }

  try {
    // If we already have a port, try to use it
    if (currentPort) {
      try {
        await currentPort.open({ baudRate: 9600, dataBits: 8, stopBits: 1, parity: 'none' });
        const writer = currentPort.writable.getWriter();
        
        // Try all Xprinter XP-5811Z commands in sequence
        const commands = [
          // Standard commands first
          CASH_DRAWER_COMMANDS.PIN2,        // Standard command for pin 2
          CASH_DRAWER_COMMANDS.PIN5,        // Standard command for pin 5
          
          // Add a small delay between command groups
          async () => await new Promise(resolve => setTimeout(resolve, 300)),
          
          // Try Xprinter specific commands
          CASH_DRAWER_COMMANDS.XPRINTER1,   // Common Xprinter command 1
          CASH_DRAWER_COMMANDS.XPRINTER2,   // Common Xprinter command 2 (longer pulse)
          CASH_DRAWER_COMMANDS.XPRINTER_DIRECT, // Direct Xprinter command
          
          // Add a small delay between command groups
          async () => await new Promise(resolve => setTimeout(resolve, 300)),
          
          // Try alternative commands if above don't work
          new Uint8Array([0x1B, 0x70, 0x00, 0x78, 0x78]),  // Alternative 1
          new Uint8Array([0x1B, 0x70, 0x01, 0x78, 0x78])   // Alternative 2
        ];
        
        for (const cmd of commands) {
          try {
            if (typeof cmd === 'function') {
              await cmd();
            } else {
              console.log('Trying command:', Array.from(cmd).map(b => b.toString(16).padStart(2, '0')).join(' '));
              await writer.write(cmd);
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          } catch (e) {
            console.warn('Error with command:', e);
          }
        }
        
        writer.releaseLock();
        await currentPort.close();
        return true;
      } catch (e) {
        console.warn('Error using existing port, will request new one:', e);
        currentPort = null; // Reset port if there's an error
      }
    }

    // If we get here, we need to request a new port
    try {
      const port = await (navigator as any).serial.requestPort();
      console.log('Selected port info:', {
        usbVendorId: port.getInfo().usbVendorId?.toString(16),
        usbProductId: port.getInfo().usbProductId?.toString(16),
        portName: port.getInfo().path
      });
      
      // Save the port for future use
      currentPort = port;
      
      if (!port) {
        throw new Error('Tidak ada port USB printer yang terdeteksi. Pastikan printer terhubung dengan benar.');
      }
      
      // Open the port
      await port.open({ baudRate: 9600 });
      
      // Get writer
      const writer = port.writable.getWriter();
      const command = pin === 2 ? CASH_DRAWER_COMMANDS.PIN2 : CASH_DRAWER_COMMANDS.PIN5;
      await writer.write(command);
      
      // Add small delay to ensure command is processed
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Clean up
      writer.releaseLock();
      await port.close();
      
      return true;
    } catch (error) {
      console.error('Error controlling cash drawer:', error);
      currentPort = null; // Reset port on error
      throw error;
    }
  } catch (error) {
    console.error('Error controlling cash drawer:', error);
    return false;
  }
}

/**
 * Simple test function to verify cash drawer functionality
 * @returns Promise<boolean> - Whether the test was successful
 */
export async function testCashDrawer(): Promise<boolean> {
  console.log('Testing cash drawer...');
  const success = await openCashDrawer(2);
  if (success) {
    console.log('Cash drawer opened successfully');
  } else {
    console.error('Failed to open cash drawer');
  }
  return success;
}
