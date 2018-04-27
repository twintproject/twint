declare module "electron-osx-sign" {
  interface BaseSignOptions {
    app: string;
    identity?: string;
    platform?: string;
    keychain?: string;
  }

  interface SignOptions extends BaseSignOptions {
    binaries?: string[];
    entitlements?: string;
    'entitlements-inherit'?: string;
    'gatekeeper-assess'?: boolean;
    ignore?: string;
    'pre-auto-entitlements'?: boolean;
    'pre-embed-provisioning-profile'?: boolean;
    'provisioning-profile'?: string;
    'requirements'?: string;
    'type'?: string;
    version?: string;
    'identity-validation'?: boolean;
  }

  export function sign(opts: SignOptions, callback: (error: Error) => void): void;

  export function signAsync(opts: SignOptions): Promise<any>;

  interface FlatOptions extends BaseSignOptions {
    install?: string;
    pkg?: string;
    scripts?: string;
  }

  export function flat(opts: FlatOptions, callback: (error: Error) => void): void;

  export function flatAsync(opts: FlatOptions): Promise<any>;
}
