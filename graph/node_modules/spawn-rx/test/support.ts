import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';

declare const global: any;

chai.should();
chai.use(chaiAsPromised);

global.chai = chai;
global.chaiAsPromised = chaiAsPromised;
global.expect = chai.expect;
global.AssertionError = chai.AssertionError;
global.assert = chai.assert;
global.Assertion = (chai as any).Assertion; //'Assertion' is not existing?
