import { rebuild, rebuildNativeModules } from './rebuild';
export declare const installNodeHeaders: () => Promise<void>;
export declare const shouldRebuildNativeModules: () => Promise<boolean>;
export declare const preGypFixRun: () => Promise<void>;
export { rebuild, rebuildNativeModules };
export default rebuild;
