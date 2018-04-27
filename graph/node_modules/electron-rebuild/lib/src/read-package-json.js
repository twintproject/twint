"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs-extra");
const path = require("path");
function readPackageJson(dir, safe = false) {
    return __awaiter(this, void 0, void 0, function* () {
        let packageData;
        try {
            packageData = yield fs.readFile(path.resolve(dir, 'package.json'), 'utf8');
        }
        catch (err) {
            if (safe) {
                packageData = '{}';
            }
            else {
                throw err;
            }
        }
        return JSON.parse(packageData);
    });
}
exports.readPackageJson = readPackageJson;
;
//# sourceMappingURL=read-package-json.js.map