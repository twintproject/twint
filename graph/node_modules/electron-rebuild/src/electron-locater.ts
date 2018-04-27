import * as fs from 'fs';
import * as path from 'path';

const possibleModuleNames = ['electron', 'electron-prebuilt', 'electron-prebuilt-compile'];

export function locateElectronPrebuilt() {
  let electronPath: string | null = null;

  // Attempt to locate modules by path
  let foundModule = possibleModuleNames.some((moduleName) => {
    electronPath = path.join(__dirname, '..', '..', '..', moduleName);
    return fs.existsSync(electronPath);
  });

  // Return a path if we found one
  if (foundModule) return electronPath;

  // Attempt to locate modules by require
  foundModule = possibleModuleNames.some((moduleName) => {
    try {
      electronPath = path.join(require.resolve(moduleName), '..');
    } catch (e) {
      return false;
    }

    return fs.existsSync(electronPath);
  });

  // Return a path if we found one
  if (foundModule) return electronPath;
  return null;
}
