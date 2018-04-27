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
var fs = require("fs-extra");
var path = require("path");
var flora_colossus_1 = require("flora-colossus");
var DestroyerOfModules = /** @class */ (function () {
    function DestroyerOfModules(_a) {
        var rootDirectory = _a.rootDirectory, walker = _a.walker, shouldKeepModuleTest = _a.shouldKeepModuleTest;
        if (rootDirectory) {
            this.walker = new flora_colossus_1.Walker(rootDirectory);
        }
        else if (walker) {
            this.walker = walker;
        }
        else {
            throw new Error('Must either provide rootDirectory or walker argument');
        }
        if (shouldKeepModuleTest) {
            this.shouldKeepFn = shouldKeepModuleTest;
        }
    }
    DestroyerOfModules.prototype.destroyModule = function (modulePath, moduleMap) {
        return __awaiter(this, void 0, void 0, function () {
            var module, nodeModulesPath, _i, _a, subModuleName, _b, _c, subScopedModuleName;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        module = moduleMap.get(modulePath);
                        if (!module) return [3 /*break*/, 13];
                        nodeModulesPath = path.resolve(modulePath, 'node_modules');
                        return [4 /*yield*/, fs.pathExists(nodeModulesPath)];
                    case 1:
                        if (!(_d.sent())) {
                            return [2 /*return*/];
                        }
                        _i = 0;
                        return [4 /*yield*/, fs.readdir(nodeModulesPath)];
                    case 2:
                        _a = _d.sent();
                        _d.label = 3;
                    case 3:
                        if (!(_i < _a.length)) return [3 /*break*/, 12];
                        subModuleName = _a[_i];
                        if (!subModuleName.startsWith('@')) return [3 /*break*/, 9];
                        _b = 0;
                        return [4 /*yield*/, fs.readdir(path.resolve(nodeModulesPath, subModuleName))];
                    case 4:
                        _c = _d.sent();
                        _d.label = 5;
                    case 5:
                        if (!(_b < _c.length)) return [3 /*break*/, 8];
                        subScopedModuleName = _c[_b];
                        return [4 /*yield*/, this.destroyModule(path.resolve(nodeModulesPath, subModuleName, subScopedModuleName), moduleMap)];
                    case 6:
                        _d.sent();
                        _d.label = 7;
                    case 7:
                        _b++;
                        return [3 /*break*/, 5];
                    case 8: return [3 /*break*/, 11];
                    case 9: return [4 /*yield*/, this.destroyModule(path.resolve(nodeModulesPath, subModuleName), moduleMap)];
                    case 10:
                        _d.sent();
                        _d.label = 11;
                    case 11:
                        _i++;
                        return [3 /*break*/, 3];
                    case 12: return [3 /*break*/, 15];
                    case 13: return [4 /*yield*/, fs.remove(modulePath)];
                    case 14:
                        _d.sent();
                        _d.label = 15;
                    case 15: return [2 /*return*/];
                }
            });
        });
    };
    DestroyerOfModules.prototype.collectKeptModules = function (_a) {
        var _b = _a.relativePaths, relativePaths = _b === void 0 ? false : _b;
        return __awaiter(this, void 0, void 0, function () {
            var modules, moduleMap, rootPath, _i, modules_1, module_1, modulePath;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, this.walker.walkTree()];
                    case 1:
                        modules = _c.sent();
                        moduleMap = new Map();
                        rootPath = path.resolve(this.walker.getRootModule());
                        for (_i = 0, modules_1 = modules; _i < modules_1.length; _i++) {
                            module_1 = modules_1[_i];
                            if (this.shouldKeepModule(module_1)) {
                                modulePath = module_1.path;
                                if (relativePaths) {
                                    modulePath = modulePath.replace("" + rootPath + path.sep, '');
                                }
                                moduleMap.set(modulePath, module_1);
                            }
                        }
                        return [2 /*return*/, moduleMap];
                }
            });
        });
    };
    DestroyerOfModules.prototype.destroy = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _a = this.destroyModule;
                        _b = [this.walker.getRootModule()];
                        return [4 /*yield*/, this.collectKeptModules({ relativePaths: false })];
                    case 1: return [4 /*yield*/, _a.apply(this, _b.concat([_c.sent()]))];
                    case 2:
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    DestroyerOfModules.prototype.shouldKeepModule = function (module) {
        var isDevDep = module.depType === flora_colossus_1.DepType.DEV || module.depType === flora_colossus_1.DepType.DEV_OPTIONAL;
        var shouldKeep = this.shouldKeepFn ? this.shouldKeepFn(module, isDevDep) : !isDevDep;
        return shouldKeep;
    };
    return DestroyerOfModules;
}());
exports.DestroyerOfModules = DestroyerOfModules;
//# sourceMappingURL=DestroyerOfModules.js.map