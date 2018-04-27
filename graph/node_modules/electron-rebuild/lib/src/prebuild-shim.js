process.argv.splice(1, 1);
// This tricks prebuild-install into not validating on the
// 1.8.x and 8.x ABI collision
Object.defineProperty(process.versions, 'modules', { value: '-1', writable: false });
/* tslint:disable */
require(process.argv[1]);
/* tslint:enable */
//# sourceMappingURL=prebuild-shim.js.map