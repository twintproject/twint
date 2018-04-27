import { expect } from 'chai';
import './support';

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

describe('The test runner', function () {
  it('should pass this test', async function () {
    await delay(1000);
    expect(true).to.be.ok;
  });
});
