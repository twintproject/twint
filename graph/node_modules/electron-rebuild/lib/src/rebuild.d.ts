/// <reference types="node" />
import * as EventEmitter from 'events';
export declare type ModuleType = 'prod' | 'dev' | 'optional';
export declare type RebuildMode = 'sequential' | 'parallel';
export interface RebuildOptions {
    buildPath: string;
    electronVersion: string;
    arch?: string;
    extraModules?: string[];
    onlyModules?: string[] | null;
    force?: boolean;
    headerURL?: string;
    types?: ModuleType[];
    mode?: RebuildMode;
    debug?: boolean;
}
export interface RebuilderOptions extends RebuildOptions {
    lifecycle: EventEmitter;
}
export declare type RebuilderResult = Promise<void> & {
    lifecycle: EventEmitter;
};
export declare type RebuildFunctionWithOptions = (options: RebuildOptions) => RebuilderResult;
export declare type RebuildFunctionWithArgs = (buildPath: string, electronVersion: string, arch?: string, extraModules?: string[], force?: boolean, headerURL?: string, types?: ModuleType[], mode?: RebuildMode, onlyModules?: string[] | null, debug?: boolean) => RebuilderResult;
export declare type RebuildFunction = RebuildFunctionWithArgs & RebuildFunctionWithOptions;
export declare const rebuild: RebuildFunction;
export declare function createOptions(buildPath: string, electronVersion: string, arch: string, extraModules: string[], force: boolean, headerURL: string, types: ModuleType[], mode: RebuildMode, onlyModules: string[] | null, debug: boolean): RebuildOptions;
export declare function rebuildNativeModules(electronVersion: string, modulePath: string, whichModule: string | undefined, _headersDir: string | null | undefined, arch: string | undefined, _command: string, _ignoreDevDeps?: boolean, _ignoreOptDeps?: boolean, _verbose?: boolean): RebuilderResult;
