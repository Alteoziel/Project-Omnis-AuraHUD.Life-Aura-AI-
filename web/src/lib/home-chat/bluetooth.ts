/**
 * Web Bluetooth helpers for Home Chat pairing.
 *
 * Phone-to-phone GATT is not available in iOS PWAs (Apple does not expose
 * Bluetooth to Safari / Home Screen web apps). Android Chrome can scan or
 * advertise in some builds. Pairing still works everywhere via QR / code;
 * Bluetooth is used when the browser actually exposes a radio API.
 */

export const HOME_CHAT_BLE_SERVICE = "a1a10000-5c0d-4e11-9c4a-00a1a1c0ffee";
export const HOME_CHAT_BLE_CHAR = "a1a10001-5c0d-4e11-9c4a-00a1a1c0ffee";

export type BluetoothCapability = {
  supported: boolean;
  canRequestDevice: boolean;
  canAdvertise: boolean;
  canScan: boolean;
  reason: "ok" | "ios-or-unsupported" | "permission-policy";
};

type BleRemoteGattServer = {
  getPrimaryService: (uuid: string) => Promise<{
    getCharacteristic: (uuid: string) => Promise<{
      readValue: () => Promise<BufferSource>;
    }>;
  }>;
  disconnect: () => void;
};

type BleDevice = {
  name?: string | null;
  gatt?: {
    connect: () => Promise<BleRemoteGattServer>;
  };
};

type BluetoothAdvertiser = {
  advertise?: (options: {
    uuids?: string[];
    appearance?: number;
  }) => Promise<unknown>;
  requestDevice: (options: {
    filters?: Array<{ services?: string[]; namePrefix?: string }>;
    optionalServices?: string[];
    acceptAllDevices?: boolean;
  }) => Promise<BleDevice>;
  requestLEScan?: (options: {
    filters?: Array<{ services?: string[] }>;
    keepRepeatedDevices?: boolean;
  }) => Promise<{ stop: () => void }>;
  getAvailability?: () => Promise<boolean>;
};

type BluetoothNavigator = Navigator & { bluetooth?: BluetoothAdvertiser };

export function getBluetoothCapability(): BluetoothCapability {
  if (typeof navigator === "undefined") {
    return {
      supported: false,
      canRequestDevice: false,
      canAdvertise: false,
      canScan: false,
      reason: "ios-or-unsupported",
    };
  }
  const bluetooth = (navigator as BluetoothNavigator).bluetooth;
  if (!bluetooth) {
    return {
      supported: false,
      canRequestDevice: false,
      canAdvertise: false,
      canScan: false,
      reason: "ios-or-unsupported",
    };
  }
  return {
    supported: true,
    canRequestDevice: typeof bluetooth.requestDevice === "function",
    canAdvertise: typeof bluetooth.advertise === "function",
    canScan: typeof bluetooth.requestLEScan === "function",
    reason: "ok",
  };
}

export async function advertiseHomeChatInvite(inviteText: string): Promise<() => void> {
  const bluetooth = (navigator as BluetoothNavigator).bluetooth;
  if (!bluetooth?.advertise) {
    throw new Error("This browser cannot advertise over Bluetooth.");
  }
  void inviteText;
  const advertisement = await bluetooth.advertise({
    uuids: [HOME_CHAT_BLE_SERVICE],
    appearance: 0x0341,
  });
  return () => {
    const stoppable = advertisement as { stop?: () => void };
    stoppable.stop?.();
  };
}

export async function requestNearbyHomeChatDevice(): Promise<string | null> {
  const bluetooth = (navigator as BluetoothNavigator).bluetooth;
  if (!bluetooth?.requestDevice) {
    throw new Error("This browser cannot scan for Bluetooth devices.");
  }
  const device = await bluetooth.requestDevice({
    filters: [{ services: [HOME_CHAT_BLE_SERVICE] }, { namePrefix: "Aura Home" }],
    optionalServices: [HOME_CHAT_BLE_SERVICE],
  });
  const gatt = await device.gatt?.connect();
  if (!gatt) return device.name ?? null;
  try {
    const service = await gatt.getPrimaryService(HOME_CHAT_BLE_SERVICE);
    const characteristic = await service.getCharacteristic(HOME_CHAT_BLE_CHAR);
    const value = await characteristic.readValue();
    return new TextDecoder().decode(value);
  } catch {
    return device.name ?? null;
  } finally {
    gatt.disconnect();
  }
}
