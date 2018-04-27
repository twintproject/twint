"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var debug = require("debug");
var fs = require("fs-extra");
var path = require("path");
var depTypes_1 = require("./depTypes");
var d = debug('flora-colossus');
var Walker = /** @class */ (function () {
    function Walker(modulePath) {
        this.walkHistory = new Set();
        this.cache = null;
        if (!modulePath || typeof modulePath !== 'string') {
            throw new Error('modulePath must be provided as a string');
        }
        d("creating walker with rootModule=" + modulePath);
        this.rootModule = modulePath;
    }
    Walker.prototype.relativeModule = function (rootPath, moduleName) {
        return path.resolve(rootPath, 'node_modules', moduleName);
    };
    Walker.prototype.loadPackageJSON = function (modulePath) {
        return __awaiter(this, void 0, void 0, function () {
            var pJPath, pJ;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        pJPath = path.resolve(modulePath, 'package.json');
                        return [4 /*yield*/, fs.pathExists(pJPath)];
                    case 1:
                        if (!_a.sent()) return [3 /*break*/, 3];
                        return [4 /*yield*/, fs.readJson(pJPath)];
                    case 2:
                        pJ = _a.sent();
                        if (!pJ.dependencies)
                            pJ.dependencies = {};
                        if (!pJ.devDependencies)
                            pJ.devDependencies = {};
                        if (!pJ.optionalDependencies)
                            pJ.optionalDependencies = {};
                        return [2 /*return*/, pJ];
                    case 3: return [2 /*return*/, null];
                }
            });
        });
    };
    Walker.prototype.walkDependenciesForModuleInModule = function (moduleName, modulePath, depType) {
        return __awaiter(this, void 0, void 0, function () {
            var testPath, discoveredPath, lastRelative;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        testPath = modulePath;
                        discoveredPath = null;
                        lastRelative = null;
                        _a.label = 1;
                    case 1:
                        if (!(!discoveredPath && this.relativeModule(testPath, moduleName) !== lastRelative)) return [3 /*break*/, 3];
                        lastRelative = this.relativeModule(testPath, moduleName);
                        return [4 /*yield*/, fs.pathExists(lastRelative)];
                    case 2:
                        if (_a.sent()) {
                            discoveredPath = lastRelative;
                        }
                        else {
                            if (path.basename(path.dirname(testPath)) !== 'node_modules') {
                                testPath = path.dirname(testPath);
                            }
                            testPath = path.dirname(path.dirname(testPath));
                        }
                        return [3 /*break*/, 1];
                    case 3:
                        // If we can't find it the install is probably buggered
                        if (!discoveredPath && depType !== depTypes_1.DepType.OPTIONAL && depType !== depTypes_1.DepType.DEV_OPTIONAL) {
                            throw new Error("Failed to locate module \"" + moduleName + "\" from \"" + modulePath + "\"\n\n        This normally means that either you have deleted this package already somehow (check your ignore settings if using electron-packager).  Or your module installation failed.");
                        }
                        if (!discoveredPath) return [3 /*break*/, 5];
                        return [4 /*yield*/, this.walkDependenciesForModule(discoveredPath, depType)];
                    case 4:
                        _a.sent();
                        _a.label = 5;
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    Walker.prototype.walkDependenciesForModule = function (modulePath, depType) {
        return __awaiter(this, void 0, void 0, function () {
            var existingModule, pJ, _a, _b, _i, moduleName, _c, _d, _e, moduleName, _f, _g, _h, moduleName;
            return __generator(this, function (_j) {
                switch (_j.label) {
                    case 0:
                        d('walk reached:', modulePath, ' Type is:', depTypes_1.DepType[depType]);
                        // We have already traversed this module
                        if (this.walkHistory.has(modulePath)) {
                            d('already walked this route');
                            existingModule = this.modules.find(function (module) { return module.path === modulePath; });
                            // If the depType we are traversing with now is higher than the
                            // last traversal then update it (prod superseeds dev for instance)
                            if (depTypes_1.depTypeGreater(depType, existingModule.depType)) {
                                d("existing module has a type of \"" + existingModule.depType + "\", new module type would be \"" + depType + "\" therefore updating");
                                existingModule.depType = depType;
                            }
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, this.loadPackageJSON(modulePath)];
                    case 1:
                        pJ = _j.sent();
                        // If the module doesn't have a package.json file it is probably a
                        // dead install from yarn (they dont clean up for some reason)
                        if (!pJ) {
                            d('walk hit a dead end, this module is incomplete');
                            return [2 /*return*/];
                        }
                        // Record this module as being traversed
                        this.walkHistory.add(modulePath);
                        this.modules.push({
                            depType: depType,
                            path: modulePath,
                            name: pJ.name,
                        });
                        _a = [];
                        for (_b in pJ.dependencies)
                            _a.push(_b);
                        _i = 0;
                        _j.label = 2;
                    case 2:
                        if (!(_i < _a.length)) return [3 /*break*/, 5];
                        moduleName = _a[_i];
                        // npm decides it's a funny thing to put optional dependencies in the "dependencies" section
                        // after install, because that makes perfect sense
                        if (moduleName in pJ.optionalDependencies) {
                            d("found " + moduleName + " in prod deps of " + modulePath + " but it is also marked optional");
                            return [3 /*break*/, 4];
                        }
                        return [4 /*yield*/, this.walkDependenciesForModuleInModule(moduleName, modulePath, depTypes_1.childDepType(depType, depTypes_1.DepType.PROD))];
                    case 3:
                        _j.sent();
                        _j.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 2];
                    case 5:
                        if (!(depType === depTypes_1.DepType.ROOT)) return [3 /*break*/, 9];
                        d('we\'re still at the beginning, walking down the dev route');
                        _c = [];
                        for (_d in pJ.devDependencies)
                            _c.push(_d);
                        _e = 0;
                        _j.label = 6;
                    case 6:
                        if (!(_e < _c.length)) return [3 /*break*/, 9];
                        moduleName = _c[_e];
                        return [4 /*yield*/, this.walkDependenciesForModuleInModule(moduleName, modulePath, depTypes_1.childDepType(depType, depTypes_1.DepType.DEV))];
                    case 7:
                        _j.sent();
                        _j.label = 8;
                    case 8:
                        _e++;
                        return [3 /*break*/, 6];
                    case 9:
                        _f = [];
                        for (_g in pJ.optionalDependencies)
                            _f.push(_g);
                        _h = 0;
                        _j.label = 10;
                    case 10:
                        if (!(_h < _f.length)) return [3 /*break*/, 13];
                        moduleName = _f[_h];
                        return [4 /*yield*/, this.walkDependenciesForModuleInModule(moduleName, modulePath, depTypes_1.childDepType(depType, depTypes_1.DepType.OPTIONAL))];
                    case 11:
                        _j.sent();
                        _j.label = 12;
                    case 12:
                        _h++;
                        return [3 /*break*/, 10];
                    case 13: return [2 /*return*/];
                }
            });
        });
    };
    Walker.prototype.walkTree = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        d('starting tree walk');
                        if (!this.cache) {
                            this.cache = new Promise(function (resolve, reject) { return __awaiter(_this, void 0, void 0, function () {
                                var err_1;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            this.modules = [];
                                            _a.label = 1;
                                        case 1:
                                            _a.trys.push([1, 3, , 4]);
                                            return [4 /*yield*/, this.walkDependenciesForModule(this.rootModule, depTypes_1.DepType.ROOT)];
                                        case 2:
                                            _a.sent();
                                            return [3 /*break*/, 4];
                                        case 3:
                                            err_1 = _a.sent();
                                            reject(err_1);
                                            return [2 /*return*/];
                                        case 4:
                                            resolve(this.modules);
                                            return [2 /*return*/];
                                    }
                                });
                            }); });
                        }
                        else {
                            d('tree walk in progress / completed already, waiting for existing walk to complete');
                        }
                        return [4 /*yield*/, this.cache];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    Walker.prototype.getRootModule = function () {
        return this.rootModule;
    };
    return Walker;
}());
exports.Walker = Walker;
//# sourceMappingURL=Walker.js.map