import { rebuild, rebuildNativeModules } from './rebuild';

export const installNodeHeaders = () => Promise.resolve();
export const shouldRebuildNativeModules  = () => Promise.resolve(true);
export const preGypFixRun = () => Promise.resolve();
export { rebuild, rebuildNativeModules };
export default rebuild;
Object.defineProperty(exports, '__esModule', {
  value: true
});
