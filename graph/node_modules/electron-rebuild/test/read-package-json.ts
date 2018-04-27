import * as path from 'path';
import { expect } from 'chai';

import { readPackageJson } from '../src/read-package-json';

describe('read-package-json', () => {
  it('should find a package.json file from the given directory', async () => {
    expect(await readPackageJson(path.resolve(__dirname, '..'))).to.deep.equal(require('../package.json'));
  });
});
