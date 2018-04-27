import * as path from 'path';
import * as net from 'net';
import * as sfs from 'fs';
import * as assign from 'lodash.assign';

import 'rxjs/add/observable/of';
import 'rxjs/add/observable/merge';
import 'rxjs/add/operator/pluck';
import 'rxjs/add/operator/reduce';
import { Observable } from 'rxjs/Observable';
import { Observer } from 'rxjs/Observer';
import { Subscription } from 'rxjs/Subscription';
import { AsyncSubject } from 'rxjs/AsyncSubject';
import { Subject } from 'rxjs/Subject';
import * as childProcess from 'child_process';

const spawnOg: typeof childProcess.spawn = require('child_process').spawn; //tslint:disable-line:no-var-requires
const isWindows = process.platform === 'win32';

const d = require('debug')('spawn-rx'); //tslint:disable-line:no-var-requires

/**
 * stat a file but don't throw if it doesn't exist
 *
 * @param  {string} file The path to a file
 * @return {Stats}       The stats structure
 *
 * @private
 */
function statSyncNoException(file: string): sfs.Stats | null {
  try {
    return sfs.statSync(file);
  } catch (e) {
    return null;
  }
}

/**
 * Search PATH to see if a file exists in any of the path folders.
 *
 * @param  {string} exe The file to search for
 * @return {string}     A fully qualified path, or the original path if nothing
 *                      is found
 *
 * @private
 */
function runDownPath(exe: string): string {
  // NB: Windows won't search PATH looking for executables in spawn like
  // Posix does

  // Files with any directory path don't get this applied
  if (exe.match(/[\\\/]/)) {
    d('Path has slash in directory, bailing');
    return exe;
  }

  let target = path.join('.', exe);
  if (statSyncNoException(target)) {
    d(`Found executable in currect directory: ${target}`);
    return target;
  }

  let haystack = process.env.PATH!.split(isWindows ? ';' : ':');
  for (let p of haystack) {
    let needle = path.join(p, exe);
    if (statSyncNoException(needle)) {
      return needle;
    };
  }

  d('Failed to find executable anywhere in path');
  return exe;
}

/**
 * Finds the actual executable and parameters to run on Windows. This method
 * mimics the POSIX behavior of being able to run scripts as executables by
 * replacing the passed-in executable with the script runner, for PowerShell,
 * CMD, and node scripts.
 *
 * This method also does the work of running down PATH, which spawn on Windows
 * also doesn't do, unlike on POSIX.
 *
 * @param  {string} exe           The executable to run
 * @param  {Array<string>} args   The arguments to run
 *
 * @return {Object}               The cmd and args to run
 * @property {string} cmd         The command to pass to spawn
 * @property {Array<string>} args The arguments to pass to spawn
 */
export function findActualExecutable(exe: string, args: Array<string>): {
  cmd: string;
  args: Array<string>
} {
  // POSIX can just execute scripts directly, no need for silly goosery
  if (process.platform !== 'win32') {
    return { cmd: runDownPath(exe), args: args };
  }

  if (!sfs.existsSync(exe)) {
    // NB: When you write something like `surf-client ... -- surf-build` on Windows,
    // a shell would normally convert that to surf-build.cmd, but since it's passed
    // in as an argument, it doesn't happen
    const possibleExts = ['.exe', '.bat', '.cmd', '.ps1'];
    for (let ext of possibleExts) {
      let possibleFullPath = runDownPath(`${exe}${ext}`);

      if (sfs.existsSync(possibleFullPath)) {
        return findActualExecutable(possibleFullPath, args);
      }
    }
  }

  if (exe.match(/\.ps1$/i)) {
    let cmd = path.join(process.env.SYSTEMROOT!, 'System32', 'WindowsPowerShell', 'v1.0', 'PowerShell.exe');
    let psargs = ['-ExecutionPolicy', 'Unrestricted', '-NoLogo', '-NonInteractive', '-File', exe];

    return { cmd: cmd, args: psargs.concat(args) };
  }

  if (exe.match(/\.(bat|cmd)$/i)) {
    let cmd = path.join(process.env.SYSTEMROOT!, 'System32', 'cmd.exe');
    let cmdArgs = ['/C', exe, ...args];

    return { cmd: cmd, args: cmdArgs };
  }

  if (exe.match(/\.(js)$/i)) {
    let cmd = process.execPath;
    let nodeArgs = [exe];

    return { cmd: cmd, args: nodeArgs.concat(args) };
  }

  // Dunno lol
  return { cmd: exe, args: args };
}

/**
 * Spawns a process but detached from the current process. The process is put
 * into its own Process Group that can be killed by unsubscribing from the
 * return Observable.
 *
 * @param  {string} exe               The executable to run
 * @param  {Array<string>} params     The parameters to pass to the child
 * @param  {Object} opts              Options to pass to spawn.
 *
 * @return {Observable<string>}       Returns an Observable that when subscribed
 *                                    to, will create a detached process. The
 *                                    process output will be streamed to this
 *                                    Observable, and if unsubscribed from, the
 *                                    process will be terminated early. If the
 *                                    process terminates with a non-zero value,
 *                                    the Observable will terminate with onError.
 */
export function spawnDetached(exe: string, params: Array<string>, opts: any = null): Observable<string> {
  const { cmd, args } = findActualExecutable(exe, params);

  if (!isWindows) {
    return spawn(cmd, args, assign({}, opts || {}, { detached: true }));
  };

  const newParams = [cmd].concat(args);

  let target = path.join(__dirname, '..', '..', 'vendor', 'jobber', 'Jobber.exe');
  let options = assign({}, opts || {}, { detached: true, jobber: true });

  d(`spawnDetached: ${target}, ${newParams}`);
  return spawn(target, newParams, options);
}

/**
 * Spawns a process attached as a child of the current process.
 *
 * @param  {string} exe               The executable to run
 * @param  {Array<string>} params     The parameters to pass to the child
 * @param  {Object} opts              Options to pass to spawn.
 *
 * @return {Observable<string>}       Returns an Observable that when subscribed
 *                                    to, will create a child process. The
 *                                    process output will be streamed to this
 *                                    Observable, and if unsubscribed from, the
 *                                    process will be terminated early. If the
 *                                    process terminates with a non-zero value,
 *                                    the Observable will terminate with onError.
 */

export function spawn<T = string>(exe: string, params: Array<string> = [], opts: any = null): Observable<T> {
  opts = opts || {};
  let spawnObs = Observable.create((subj: Observer<{
    source: any,
    text: any
    }>) => {
    let { stdin, ...optsWithoutStdIn } = opts;
    let { cmd, args } = findActualExecutable(exe, params);
    d(`spawning process: ${cmd} ${args.join()}, ${JSON.stringify(optsWithoutStdIn)}`);
    let origOpts = assign({}, optsWithoutStdIn);
    if ('jobber' in origOpts) {
      delete origOpts.jobber;
    }
    if ('split' in origOpts) {
      delete origOpts.split;
    };

    const proc = spawnOg(cmd, args, origOpts);

    let bufHandler = (source: string) => (b: string | Buffer) => {
      if (b.length < 1) {
        return;
      };
      let chunk = '<< String sent back was too long >>';
      try {
        if (typeof b === 'string') {
          chunk = b.toString();
        } else {
          chunk = b.toString(origOpts.encoding || 'utf8');
        }
      } catch (e) {
        chunk = `<< Lost chunk of process output for ${exe} - length was ${b.length}>>`;
      }

      subj.next({ source: source, text: chunk });
    };

    let ret = new Subscription();

    if (opts.stdin) {
      if (proc.stdin) {
        ret.add(opts.stdin.subscribe(
          (x: any) => proc.stdin.write(x),
          subj.error.bind(subj),
          () => proc.stdin.end()
        ));
      } else {
        subj.error(new Error(`opts.stdio conflicts with provided spawn opts.stdin observable, 'pipe' is required`));
      }
    }

    let stderrCompleted: Subject<boolean> | Observable<boolean> | null = null;
    let stdoutCompleted: Subject<boolean> | Observable<boolean> | null = null;
    let noClose = false;

    if (proc.stdout) {
      stdoutCompleted = new AsyncSubject<boolean>();
      proc.stdout.on('data', bufHandler('stdout'));
      proc.stdout.on('close', () => { (stdoutCompleted! as Subject<boolean>).next(true); (stdoutCompleted! as Subject<boolean>).complete(); });
    } else {
      stdoutCompleted = Observable.of(true);
    }

    if (proc.stderr) {
      stderrCompleted = new AsyncSubject<boolean>();
      proc.stderr.on('data', bufHandler('stderr'));
      proc.stderr.on('close', () => { (stderrCompleted! as Subject<boolean>).next(true); (stderrCompleted! as Subject<boolean>).complete(); });
    } else {
      stderrCompleted = Observable.of(true);
    }

    proc.on('error', (e: Error) => {
      noClose = true;
      subj.error(e);
    });

    proc.on('close', (code: number) => {
      noClose = true;
      let pipesClosed = Observable.merge(stdoutCompleted!, stderrCompleted!)
        .reduce((acc) => acc, true);

      if (code === 0) {
        pipesClosed.subscribe(() => subj.complete());
      } else {
        pipesClosed.subscribe(() => subj.error(new Error(`Failed with exit code: ${code}`)));
      }
    });

    ret.add(new Subscription(() => {
      if (noClose) {
        return;
      };

      d(`Killing process: ${cmd} ${args.join()}`);
      if (opts.jobber) {
        // NB: Connecting to Jobber's named pipe will kill it
        net.connect(`\\\\.\\pipe\\jobber-${proc.pid}`);
        setTimeout(() => proc.kill(), 5 * 1000);
      } else {
        proc.kill();
      }
    }));

    return ret;
  });

  return opts.split ? spawnObs : spawnObs.pluck('text');
}

function wrapObservableInPromise<T>(obs: Observable<T>) {
  return new Promise<string>((res, rej) => {
    let out = '';

    obs.subscribe(
      (x) => out += x,
      (e) => rej(new Error(`${out}\n${e.message}`)),
      () => res(out));
  });
}

/**
 * Spawns a process but detached from the current process. The process is put
 * into its own Process Group.
 *
 * @param  {string} exe               The executable to run
 * @param  {Array<string>} params     The parameters to pass to the child
 * @param  {Object} opts              Options to pass to spawn.
 *
 * @return {Promise<string>}       Returns an Promise that represents a detached
 *                                 process. The value returned is the process
 *                                 output. If the process terminates with a
 *                                 non-zero value, the Promise will resolve with
 *                                 an Error.
 */
export function spawnDetachedPromise(exe: string, params: Array<string>, opts: any = null): Promise<string> {
  return wrapObservableInPromise<string>(spawnDetached(exe, params, opts));
}

/**
 * Spawns a process as a child process.
 *
 * @param  {string} exe               The executable to run
 * @param  {Array<string>} params     The parameters to pass to the child
 * @param  {Object} opts              Options to pass to spawn.
 *
 * @return {Promise<string>}       Returns an Promise that represents a child
 *                                 process. The value returned is the process
 *                                 output. If the process terminates with a
 *                                 non-zero value, the Promise will resolve with
 *                                 an Error.
 */
export function spawnPromise(exe: string, params: Array<string>, opts: any = null): Promise<string> {
  return wrapObservableInPromise<string>(spawn(exe, params, opts));
}
