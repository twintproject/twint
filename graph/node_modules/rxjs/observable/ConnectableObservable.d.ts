import { Subject } from '../Subject';
import { Observable } from '../Observable';
import { Subscriber } from '../Subscriber';
import { Subscription } from '../Subscription';
/**
 * @class ConnectableObservable<T>
 */
export declare class ConnectableObservable<T> extends Observable<T> {
    protected source: Observable<T>;
    protected subjectFactory: () => Subject<T>;
    protected _subject: Subject<T>;
    protected _refCount: number;
    protected _connection: Subscription;
    _isComplete: boolean;
    constructor(source: Observable<T>, subjectFactory: () => Subject<T>);
    protected _subscribe(subscriber: Subscriber<T>): Subscription;
    protected getSubject(): Subject<T>;
    connect(): Subscription;
    refCount(): Observable<T>;
}
export declare const connectableObservableDescriptor: PropertyDescriptorMap;
