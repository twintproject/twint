import * as fs from 'fs-extra';
import * as path from 'path';

export async function readPackageJson(dir: string, safe = false) {
  let packageData;
  try {
    packageData = await fs.readFile(path.resolve(dir, 'package.json'), 'utf8');
  } catch (err) {
    if (safe) {
      packageData = '{}';
    } else {
      throw err;
    }
  }

  return JSON.parse(packageData);
};
