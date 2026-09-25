'use strict';
// Deliberately (almost) empty: the game needs no Node.js or Electron APIs.
// Only a read-only flag so the web code can tell it runs in the desktop app.
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('paintlandDesktop', Object.freeze({ platform: process.platform }));
