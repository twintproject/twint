import { DepType } from './depTypes';
export declare type VersionRange = string;
export interface PackageJSON {
    name: string;
    dependencies: {
        [name: string]: VersionRange;
    };
    devDependencies: {
        [name: string]: VersionRange;
    };
    optionalDependencies: {
        [name: string]: VersionRange;
    };
}
export interface Module {
    path: string;
    depType: DepType;
    name: string;
}
export declare class Walker {
    private rootModule;
    private modules;
    private walkHistory;
    constructor(modulePath: string);
    private relativeModule(rootPath, moduleName);
    private loadPackageJSON(modulePath);
    private walkDependenciesForModuleInModule(moduleName, modulePath, depType);
    private walkDependenciesForModule(modulePath, depType);
    private cache;
    walkTree(): Promise<Module[]>;
    getRootModule(): string;
}
