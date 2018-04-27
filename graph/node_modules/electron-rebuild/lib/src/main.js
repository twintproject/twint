"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rebuild_1 = require("./rebuild");
exports.rebuild = rebuild_1.rebuild;
exports.rebuildNativeModules = rebuild_1.rebuildNativeModules;
exports.installNodeHeaders = () => Promise.resolve();
exports.shouldRebuildNativeModules = () => Promise.resolve(true);
exports.preGypFixRun = () => Promise.resolve();
exports.default = rebuild_1.rebuild;
Object.defineProperty(exports, '__esModule', {
    value: true
});
//# sourceMappingURL=main.js.map