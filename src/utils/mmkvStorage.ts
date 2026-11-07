import { createMMKV } from 'react-native-mmkv';

const mmkv = createMMKV({
  id: 'bangunpaksa-storage',
  encryptionKey: 'bangunpaksa-secure-key-2026',
});

export class MMKVStorage {
  getItem(key: string): string | null {
    return mmkv.getString(key) ?? null;
  }

  setItem(key: string, value: string): void {
    mmkv.set(key, value);
  }

  removeItem(key: string): void {
    mmkv.remove(key);
  }

  getAllKeys(): string[] {
    return mmkv.getAllKeys();
  }

  clear(): void {
    mmkv.clearAll();
  }
}

export { mmkv };