import { expect } from 'chai';
import './support';

import { spawn, spawnPromise, spawnDetachedPromise } from '../src/index';

import { Observable } from 'rxjs';

const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

describe('The spawnPromise method', function() {
  it('should return a uuid when we call uuid', async function() {
    // NB: Since we get run via npm run test, we know that npm bins are in our
    // PATH.
    let result = await spawnPromise('uuid', []);
    expect(result.match(uuidRegex)).to.be.ok;
  });
});

describe('The spawnDetachedPromise method', function() {
  it('should return a uuid when we call uuid', async function() {
    // NB: Since we get run via npm run test, we know that npm bins are in our
    // PATH.
    let result = await spawnDetachedPromise('uuid', ['--help']);
    expect(result.length > 10).to.be.ok;
  });
});

function wrapSplitObservableInPromise(obs: Observable<{
  source: any,
  text: any
}>): Promise<{
  stderr: string,
  stdout: string,
  error: Error | undefined
}> {
  return new Promise((res) => {
    let out = {stderr: '', stdout: '', error: undefined };

    obs.subscribe(
      (x) => {
        if (x.source === 'stdout') {
          out.stdout += x.text;
        } else {
          out.stderr += x.text;
        }
      },
      (e) => { out.error = e; res(out); },
      () => res(out));
  });
}

describe('The spawn method', function() {
  it('should return a disposable subscription', async function() {
    // this only check the unsubscribe goes w/o error, not that the spawned process is killed
    // (difficult to do that, maybe iterate through child processes and check ?)
    spawn('sleep', ['2']).subscribe().unsubscribe();
  });

  it('should return split stderr in a inner tag when called with split', async function() {
    // provide an invalid param to uuid so it complains on stderr
    let rxSpawn: Observable<{ source: any, text: any }> = spawn('uuid', ['foo'], {split: true}) as any;
    let result = await wrapSplitObservableInPromise(rxSpawn);
    expect(result.stderr.length > 10).to.be.ok;
    expect(result.stdout).to.be.empty;
    expect(result.error).to.be.an('error');
  });

  it('should return split stdout in a inner tag when called with split', async function() {
    let rxSpawn: Observable<{ source: any, text: any }> = spawn('uuid', [], {split: true});
    let result = await wrapSplitObservableInPromise(rxSpawn);
    expect(result.stdout.match(uuidRegex)).to.be.ok;
    expect(result.stderr).to.be.empty;
    expect(result.error).to.be.undefined;
  });

  it('should ignore stderr if options.stdio = ignore', async function() {
    let rxSpawn: Observable<{ source: any, text: any }> = spawn('uuid', ['foo'], {split: true, stdio: [null, null, 'ignore']});
    let result = await wrapSplitObservableInPromise(rxSpawn);
    expect(result.stderr).to.be.empty;
  });

  it('should ignore stdout if options.stdio = inherit', async function() {
    let rxSpawn: Observable<{ source: any, text: any }> = spawn('uuid', [], {split: true, stdio: [null, 'inherit', null]});
    let result = await wrapSplitObservableInPromise(rxSpawn);
    expect(result.stdout).to.be.empty;
  });

  it('should croak if stdin is provided but stdio.stdin is disabled', async function() {
    let stdin = Observable.of('a');
    let rxSpawn: Observable<{ source: any, text: any }>  = spawn('marked', [], {split: true, stdin: stdin, stdio: ['ignore', null, null]});
    let result = await wrapSplitObservableInPromise(rxSpawn);
    expect(result.error).to.be.an('error');
  });

  it('should subscribe to provided stdin', async function() {
    let stdin = Observable.of('a');
    let rxSpawn: Observable<{ source: any, text: any }> = spawn('marked', [], {split: true, stdin: stdin});
    let result = await wrapSplitObservableInPromise(rxSpawn);
    expect(result.stdout.trim()).to.be.equal('<p>a</p>');
  });

});
