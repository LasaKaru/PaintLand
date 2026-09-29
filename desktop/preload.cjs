'use strict';
// Almost empty on purpose: the game needs no Node.js or Electron APIs. It gets
// a read-only platform flag, a Quit call and three narrow Steam Workshop calls (checked
// again in the main process: see steam.cjs), nothing else.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld(
  'paintlandDesktop',
  Object.freeze({
    platform: process.platform,
    quit: () => ipcRenderer.invoke('app:quit'),
    workshop: Object.freeze({
      status: () => ipcRenderer.invoke('workshop:status'),
      list: () => ipcRenderer.invoke('workshop:list'),
      publish: (item) => ipcRenderer.invoke('workshop:publish', { kind: String(item?.kind ?? ''), title: String(item?.title ?? ''), description: String(item?.description ?? ''), code: String(item?.code ?? '') }),
    }),
  }),
);
