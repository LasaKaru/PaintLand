'use strict';
// electron-builder afterPack hook: flip Electron fuses in the packaged binary.
// https://www.electronjs.org/docs/latest/tutorial/fuses
const path = require('node:path');
const { flipFuses, FuseVersion, FuseV1Options } = require('@electron/fuses');

module.exports = async function afterPack(context) {
  const ext = { darwin: '.app', win32: '.exe', linux: '' }[context.electronPlatformName];
  const name = context.packager.appInfo.productFilename;
  const exe = context.electronPlatformName === 'linux' ? path.join(context.appOutDir, context.packager.executableName) : path.join(context.appOutDir, `${name}${ext}`);
  await flipFuses(exe, {
    version: FuseVersion.V1,
    resetAdHocDarwinSignature: context.electronPlatformName === 'darwin',
    [FuseV1Options.RunAsNode]: false,
    [FuseV1Options.EnableCookieEncryption]: true,
    [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
    [FuseV1Options.EnableNodeCliInspectArguments]: false,
    [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
    [FuseV1Options.OnlyLoadAppFromAsar]: true,
    [FuseV1Options.GrantFileProtocolExtraPrivileges]: false,
  });
  console.log(`[fuses] hardened ${exe}`);
};
