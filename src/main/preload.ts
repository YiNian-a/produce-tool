// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

export type Channels = 'print-sn';

const electronHandler = {
  ipcRenderer: {
    sendMessage(channel: Channels, ...args: unknown[]) {
      ipcRenderer.send(channel, ...args);
    },
    on(channel: Channels, func: (...args: unknown[]) => void) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
        func(...args);
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
    once(channel: Channels, func: (...args: unknown[]) => void) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
  },
  getInitData: () => ipcRenderer.invoke('init-data'),
  connectPort: {
    sendMessage(channel: 'connect-send', ...args: unknown[]) {
      ipcRenderer.send(channel, ...args);
    },
    once(channel: 'connect-reply', func: (...args: unknown[]) => void) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
  },
  cancelConnect: {
    sendMessage(channel: 'disconnect-send', ...args: unknown[]) {
      ipcRenderer.send(channel, ...args);
    },
    once(channel: 'disconnect-reply', func: (...args: unknown[]) => void) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
  },
  transmitMessages: {
    sendMessage(channel: 'message-send', ...args: unknown[]) {
      ipcRenderer.send(channel, ...args);
    },
    on(channel: 'message-reply', func: (...args: unknown[]) => void) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
        func(...args);
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
  },
  transmitCodeSn: {
    sendMessage(channel: 'codesn-send', ...args: unknown[]) {
      ipcRenderer.send(channel, ...args);
    },
    on(channel: 'codesn-reply', func: (...args: unknown[]) => void) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
        func(...args);
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
  },
  paramsStore: {
    sendParams(channel: 'params-send', ...args: unknown[]) {
      ipcRenderer.send(channel, ...args);
    },
  },
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
