import * as fs from 'fs';
import * as path from 'path';
import { expect } from 'chai';
import { spawnPromise } from 'spawn-rx';

import { locateElectronPrebuilt } from '../src/electron-locater';

function packageCommand(command: string, packageName: string) {
  return spawnPromise('npm', [command, packageName], {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'ignore',
  });
}

const install: ((s: string) => Promise<void>) = packageCommand.bind(null, 'install');
const uninstall: ((s: string) => Promise<void>) = packageCommand.bind(null, 'uninstall');

const testElectronCanBeFound = () => {
  it('should return a valid path', () => {
    const electronPath = locateElectronPrebuilt();
    expect(electronPath).to.be.a('string');
    expect(fs.existsSync(electronPath!)).to.be.equal(true);
  });
};

describe('locateElectronPrebuilt', function() {
  this.timeout(30 * 1000);

  before(() => uninstall('electron'));

  it('should return null when electron is not installed', () => {
    expect(locateElectronPrebuilt()).to.be.equal(null);
  });

  describe('with electron-prebuilt installed', () => {
    before(() => install('electron-prebuilt'));

    testElectronCanBeFound();

    after(() => uninstall('electron-prebuilt'));
  });

  describe('with electron installed', () => {
    before(() => install('electron'));

    testElectronCanBeFound();

    after(() => uninstall('electron'));
  });

  after(() => install('electron'));
});
