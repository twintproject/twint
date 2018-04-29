#include <string.h>

#include "macros.h"
#include "database.h"
#include "statement.h"

using namespace node_sqlite3;

Nan::Persistent<FunctionTemplate> Database::constructor_template;

NAN_MODULE_INIT(Database::Init) {
    Nan::HandleScope scope;

    Local<FunctionTemplate> t = Nan::New<FunctionTemplate>(New);

    t->InstanceTemplate()->SetInternalFieldCount(1);
    t->SetClassName(Nan::New("Database").ToLocalChecked());

    Nan::SetPrototypeMethod(t, "close", Close);
    Nan::SetPrototypeMethod(t, "exec", Exec);
    Nan::SetPrototypeMethod(t, "wait", Wait);
    Nan::SetPrototypeMethod(t, "loadExtension", LoadExtension);
    Nan::SetPrototypeMethod(t, "serialize", Serialize);
    Nan::SetPrototypeMethod(t, "parallelize", Parallelize);
    Nan::SetPrototypeMethod(t, "configure", Configure);
    Nan::SetPrototypeMethod(t, "interrupt", Interrupt);

    NODE_SET_GETTER(t, "open", OpenGetter);

    constructor_template.Reset(t);

    Nan::Set(target, Nan::New("Database").ToLocalChecked(),
        Nan::GetFunction(t).ToLocalChecked());
}

void Database::Process() {
    Nan::HandleScope scope;

    if (!open && locked && !queue.empty()) {
        EXCEPTION(Nan::New("Database handle is closed").ToLocalChecked(), SQLITE_MISUSE, exception);
        Local<Value> argv[] = { exception };
        bool called = false;

        // Call all callbacks with the error object.
        while (!queue.empty()) {
            Call* call = queue.front();
            Local<Function> cb = Nan::New(call->baton->callback);
            if (!cb.IsEmpty() && cb->IsFunction()) {
                TRY_CATCH_CALL(this->handle(), cb, 1, argv);
                called = true;
            }
            queue.pop();
            // We don't call the actual callback, so we have to make sure that
            // the baton gets destroyed.
            delete call->baton;
            delete call;
        }

        // When we couldn't call a callback function, emit an error on the
        // Database object.
        if (!called) {
            Local<Value> info[] = { Nan::New("error").ToLocalChecked(), exception };
            EMIT_EVENT(handle(), 2, info);
        }
        return;
    }

    while (open && (!locked || pending == 0) && !queue.empty()) {
        Call* call = queue.front();

        if (call->exclusive && pending > 0) {
            break;
        }

        queue.pop();
        locked = call->exclusive;
        call->callback(call->baton);
        delete call;

        if (locked) break;
    }
}

void Database::Schedule(Work_Callback callback, Baton* baton, bool exclusive) {
    Nan::HandleScope scope;

    if (!open && locked) {
        EXCEPTION(Nan::New("Database is closed").ToLocalChecked(), SQLITE_MISUSE, exception);
        Local<Function> cb = Nan::New(baton->callback);
        if (!cb.IsEmpty() && cb->IsFunction()) {
            Local<Value> argv[] = { exception };
            TRY_CATCH_CALL(handle(), cb, 1, argv);
        }
        else {
            Local<Value> argv[] = { Nan::New("error").ToLocalChecked(), exception };
            EMIT_EVENT(handle(), 2, argv);
        }
        return;
    }

    if (!open || ((locked || exclusive || serialize) && pending > 0)) {
        queue.push(new Call(callback, baton, exclusive || serialize));
    }
    else {
        locked = exclusive;
        callback(baton);
    }
}

NAN_METHOD(Database::New) {
    if (!info.IsConstructCall()) {
        return Nan::ThrowTypeError("Use the new operator to create new Database objects");
    }

    REQUIRE_ARGUMENT_STRING(0, filename);
    int pos = 1;

    int mode;
    if (info.Length() >= pos && info[pos]->IsInt32()) {
        mode = Nan::To<int>(info[pos++]).FromJust();
    } else {
        mode = SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE | SQLITE_OPEN_FULLMUTEX;
    }

    Local<Function> callback;
    if (info.Length() >= pos && info[pos]->IsFunction()) {
        callback = Local<Function>::Cast(info[pos++]);
    }

    Database* db = new Database();
    db->Wrap(info.This());

    Nan::ForceSet(info.This(), Nan::New("filename").ToLocalChecked(), info[0].As<String>(), ReadOnly);
    Nan::ForceSet(info.This(), Nan::New("mode").ToLocalChecked(), Nan::New(mode), ReadOnly);

    // Start opening the database.
    OpenBaton* baton = new OpenBaton(db, callback, *filename, mode);
    Work_BeginOpen(baton);

    info.GetReturnValue().Set(info.This());
}

void Database::Work_BeginOpen(Baton* baton) {
    int status = uv_queue_work(uv_default_loop(),
        &baton->request, Work_Open, (uv_after_work_cb)Work_AfterOpen);
    assert(status == 0);
}

void Database::Work_Open(uv_work_t* req) {
    OpenBaton* baton = static_cast<OpenBaton*>(req->data);
    Database* db = baton->db;

    baton->status = sqlite3_open_v2(
        baton->filename.c_str(),
        &db->_handle,
        baton->mode,
        NULL
    );

    if (baton->status != SQLITE_OK) {
        baton->message = std::string(sqlite3_errmsg(db->_handle));
        sqlite3_close(db->_handle);
        db->_handle = NULL;
    }
    else {
        // Set default database handle values.
        sqlite3_busy_timeout(db->_handle, 1000);
    }
}

void Database::Work_AfterOpen(uv_work_t* req) {
    Nan::HandleScope scope;

    OpenBaton* baton = static_cast<OpenBaton*>(req->data);
    Database* db = baton->db;

    Local<Value> argv[1];
    if (baton->status != SQLITE_OK) {
        EXCEPTION(Nan::New(baton->message.c_str()).ToLocalChecked(), baton->status, exception);
        argv[0] = exception;
    }
    else {
        db->open = true;
        argv[0] = Nan::Null();
    }

    Local<Function> cb = Nan::New(baton->callback);

    if (!cb.IsEmpty() && cb->IsFunction()) {
        TRY_CATCH_CALL(db->handle(), cb, 1, argv);
    }
    else if (!db->open) {
        Local<Value> info[] = { Nan::New("error").ToLocalChecked(), argv[0] };
        EMIT_EVENT(db->handle(), 2, info);
    }

    if (db->open) {
        Local<Value> info[] = { Nan::New("open").ToLocalChecked() };
        EMIT_EVENT(db->handle(), 1, info);
        db->Process();
    }

    delete baton;
}

NAN_GETTER(Database::OpenGetter) {
    Database* db = Nan::ObjectWrap::Unwrap<Database>(info.This());
    info.GetReturnValue().Set(db->open);
}

NAN_METHOD(Database::Close) {
    Database* db = Nan::ObjectWrap::Unwrap<Database>(info.This());
    OPTIONAL_ARGUMENT_FUNCTION(0, callback);

    Baton* baton = new Baton(db, callback);
    db->Schedule(Work_BeginClose, baton, true);

    info.GetReturnValue().Set(info.This());
}

void Database::Work_BeginClose(Baton* baton) {
    assert(baton->db->locked);
    assert(baton->db->open);
    assert(baton->db->_handle);
    assert(baton->db->pending == 0);

    baton->db->RemoveCallbacks();
    baton->db->closing = true;

    int status = uv_queue_work(uv_default_loop(),
        &baton->request, Work_Close, (uv_after_work_cb)Work_AfterClose);
    assert(status == 0);
}

void Database::Work_Close(uv_work_t* req) {
    Baton* baton = static_cast<Baton*>(req->data);
    Database* db = baton->db;

    baton->status = sqlite3_close(db->_handle);

    if (baton->status != SQLITE_OK) {
        baton->message = std::string(sqlite3_errmsg(db->_handle));
    }
    else {
        db->_handle = NULL;
    }
}

void Database::Work_AfterClose(uv_work_t* req) {
    Nan::HandleScope scope;

    Baton* baton = static_cast<Baton*>(req->data);
    Database* db = baton->db;

    db->closing = false;

    Local<Value> argv[1];
    if (baton->status != SQLITE_OK) {
        EXCEPTION(Nan::New(baton->message.c_str()).ToLocalChecked(), baton->status, exception);
        argv[0] = exception;
    }
    else {
        db->open = false;
        // Leave db->locked to indicate that this db object has reached
        // the end of its life.
        argv[0] = Nan::Null();
    }

    Local<Function> cb = Nan::New(baton->callback);

    // Fire callbacks.
    if (!cb.IsEmpty() && cb->IsFunction()) {
        TRY_CATCH_CALL(db->handle(), cb, 1, argv);
    }
    else if (db->open) {
        Local<Value> info[] = { Nan::New("error").ToLocalChecked(), argv[0] };
        EMIT_EVENT(db->handle(), 2, info);
    }

    if (!db->open) {
        Local<Value> info[] = { Nan::New("close").ToLocalChecked(), argv[0] };
        EMIT_EVENT(db->handle(), 1, info);
        db->Process();
    }

    delete baton;
}

NAN_METHOD(Database::Serialize) {
    Database* db = Nan::ObjectWrap::Unwrap<Database>(info.This());
    OPTIONAL_ARGUMENT_FUNCTION(0, callback);

    bool before = db->serialize;
    db->serialize = true;

    if (!callback.IsEmpty() && callback->IsFunction()) {
        TRY_CATCH_CALL(info.This(), callback, 0, NULL);
        db->serialize = before;
    }

    db->Process();

    info.GetReturnValue().Set(info.This());
}

NAN_METHOD(Database::Parallelize) {
    Database* db = Nan::ObjectWrap::Unwrap<Database>(info.This());
    OPTIONAL_ARGUMENT_FUNCTION(0, callback);

    bool before = db->serialize;
    db->serialize = false;

    if (!callback.IsEmpty() && callback->IsFunction()) {
        TRY_CATCH_CALL(info.This(), callback, 0, NULL);
        db->serialize = before;
    }

    db->Process();

    info.GetReturnValue().Set(info.This());
}

NAN_METHOD(Database::Configure) {
    Database* db = Nan::ObjectWrap::Unwrap<Database>(info.This());

    REQUIRE_ARGUMENTS(2);

    if (Nan::Equals(info[0], Nan::New("trace").ToLocalChecked()).FromJust()) {
        Local<Function> handle;
        Baton* baton = new Baton(db, handle);
        db->Schedule(RegisterTraceCallback, baton);
    }
    else if (Nan::Equals(info[0], Nan::New("profile").ToLocalChecked()).FromJust()) {
        Local<Function> handle;
        Baton* baton = new Baton(db, handle);
        db->Schedule(RegisterProfileCallback, baton);
    }
    else if (Nan::Equals(info[0], Nan::New("busyTimeout").ToLocalChecked()).FromJust()) {
        if (!info[1]->IsInt32()) {
            return Nan::ThrowTypeError("Value must be an integer");
        }
        Local<Function> handle;
        Baton* baton = new Baton(db, handle);
        baton->status = Nan::To<int>(info[1]).FromJust();
        db->Schedule(SetBusyTimeout, baton);
    }
    else {
        return Nan::ThrowError(Exception::Error(String::Concat(
            Nan::To<String>(info[0]).ToLocalChecked(),
            Nan::New(" is not a valid configuration option").ToLocalChecked()
        )));
    }

    db->Process();

    info.GetReturnValue().Set(info.This());
}

NAN_METHOD(Database::Interrupt) {
    Database* db = Nan::ObjectWrap::Unwrap<Database>(info.This());

    if (!db->open) {
        return Nan::ThrowError("Database is not open");
    }

    if (db->closing) {
        return Nan::ThrowError("Database is closing");
    }

    sqlite3_interrupt(db->_handle);
    info.GetReturnValue().Set(info.This());
}

void Database::SetBusyTimeout(Baton* baton) {
    assert(baton->db->open);
    assert(baton->db->_handle);

    // Abuse the status field for passing the timeout.
    sqlite3_busy_timeout(baton->db->_handle, baton->status);

    delete baton;
}

void Database::RegisterTraceCallback(Baton* baton) {
    assert(baton->db->open);
    assert(baton->db->_handle);
    Database* db = baton->db;

    if (db->debug_trace == NULL) {
        // Add it.
        db->debug_trace = new AsyncTrace(db, TraceCallback);
        sqlite3_trace(db->_handle, TraceCallback, db);
    }
    else {
        // Remove it.
        sqlite3_trace(db->_handle, NULL, NULL);
        db->debug_trace->finish();
        db->debug_trace = NULL;
    }

    delete baton;
}

void Database::TraceCallback(void* db, const char* sql) {
    // Note: This function is called in the thread pool.
    // Note: Some queries, such as "EXPLAIN" queries, are not sent through this.
    static_cast<Database*>(db)->debug_trace->send(new std::string(sql));
}

void Database::TraceCallback(Database* db, std::string* sql) {
    // Note: This function is called in the main V8 thread.
    Nan::HandleScope scope;

    Local<Value> argv[] = {
        Nan::New("trace").ToLocalChecked(),
        Nan::New(sql->c_str()).ToLocalChecked()
    };
    EMIT_EVENT(db->handle(), 2, argv);
    delete sql;
}

void Database::RegisterProfileCallback(Baton* baton) {
    assert(baton->db->open);
    assert(baton->db->_handle);
    Database* db = baton->db;

    if (db->debug_profile == NULL) {
        // Add it.
        db->debug_profile = new AsyncProfile(db, ProfileCallback);
        sqlite3_profile(db->_handle, ProfileCallback, db);
    }
    else {
        // Remove it.
        sqlite3_profile(db->_handle, NULL, NULL);
        db->debug_profile->finish();
        db->debug_profile = NULL;
    }

    delete baton;
}

void Database::ProfileCallback(void* db, const char* sql, sqlite3_uint64 nsecs) {
    // Note: This function is called in the thread pool.
    // Note: Some queries, such as "EXPLAIN" queries, are not sent through this.
    ProfileInfo* info = new ProfileInfo();
    info->sql = std::string(sql);
    info->nsecs = nsecs;
    static_cast<Database*>(db)->debug_profile->send(info);
}

void Database::ProfileCallback(Database *db, ProfileInfo* info) {
    Nan::HandleScope scope;

    Local<Value> argv[] = {
        Nan::New("profile").ToLocalChecked(),
        Nan::New(info->sql.c_str()).ToLocalChecked(),
        Nan::New<Number>((double)info->nsecs / 1000000.0)
    };
    EMIT_EVENT(db->handle(), 3, argv);
    delete info;
}

void Database::RegisterUpdateCallback(Baton* baton) {
    assert(baton->db->open);
    assert(baton->db->_handle);
    Database* db = baton->db;

    if (db->update_event == NULL) {
        // Add it.
        db->update_event = new AsyncUpdate(db, UpdateCallback);
        sqlite3_update_hook(db->_handle, UpdateCallback, db);
    }
    else {
        // Remove it.
        sqlite3_update_hook(db->_handle, NULL, NULL);
        db->update_event->finish();
        db->update_event = NULL;
    }

    delete baton;
}

void Database::UpdateCallback(void* db, int type, const char* database,
        const char* table, sqlite3_int64 rowid) {
    // Note: This function is called in the thread pool.
    // Note: Some queries, such as "EXPLAIN" queries, are not sent through this.
    UpdateInfo* info = new UpdateInfo();
    info->type = type;
    info->database = std::string(database);
    info->table = std::string(table);
    info->rowid = rowid;
    static_cast<Database*>(db)->update_event->send(info);
}

void Database::UpdateCallback(Database *db, UpdateInfo* info) {
    Nan::HandleScope scope;

    Local<Value> argv[] = {
        Nan::New(sqlite_authorizer_string(info->type)).ToLocalChecked(),
        Nan::New(info->database.c_str()).ToLocalChecked(),
        Nan::New(info->table.c_str()).ToLocalChecked(),
        Nan::New<Number>(info->rowid),
    };
    EMIT_EVENT(db->handle(), 4, argv);
    delete info;
}

NAN_METHOD(Database::Exec) {
    Database* db = Nan::ObjectWrap::Unwrap<Database>(info.This());

    REQUIRE_ARGUMENT_STRING(0, sql);
    OPTIONAL_ARGUMENT_FUNCTION(1, callback);

    Baton* baton = new ExecBaton(db, callback, *sql);
    db->Schedule(Work_BeginExec, baton, true);

    info.GetReturnValue().Set(info.This());
}

void Database::Work_BeginExec(Baton* baton) {
    assert(baton->db->locked);
    assert(baton->db->open);
    assert(baton->db->_handle);
    assert(baton->db->pending == 0);
    int status = uv_queue_work(uv_default_loop(),
        &baton->request, Work_Exec, (uv_after_work_cb)Work_AfterExec);
    assert(status == 0);
}

void Database::Work_Exec(uv_work_t* req) {
    ExecBaton* baton = static_cast<ExecBaton*>(req->data);

    char* message = NULL;
    baton->status = sqlite3_exec(
        baton->db->_handle,
        baton->sql.c_str(),
        NULL,
        NULL,
        &message
    );

    if (baton->status != SQLITE_OK && message != NULL) {
        baton->message = std::string(message);
        sqlite3_free(message);
    }
}

void Database::Work_AfterExec(uv_work_t* req) {
    Nan::HandleScope scope;

    ExecBaton* baton = static_cast<ExecBaton*>(req->data);
    Database* db = baton->db;

    Local<Function> cb = Nan::New(baton->callback);

    if (baton->status != SQLITE_OK) {
        EXCEPTION(Nan::New(baton->message.c_str()).ToLocalChecked(), baton->status, exception);

        if (!cb.IsEmpty() && cb->IsFunction()) {
            Local<Value> argv[] = { exception };
            TRY_CATCH_CALL(db->handle(), cb, 1, argv);
        }
        else {
            Local<Value> info[] = { Nan::New("error").ToLocalChecked(), exception };
            EMIT_EVENT(db->handle(), 2, info);
        }
    }
    else if (!cb.IsEmpty() && cb->IsFunction()) {
        Local<Value> argv[] = { Nan::Null() };
        TRY_CATCH_CALL(db->handle(), cb, 1, argv);
    }

    db->Process();

    delete baton;
}

NAN_METHOD(Database::Wait) {
    Database* db = Nan::ObjectWrap::Unwrap<Database>(info.This());

    OPTIONAL_ARGUMENT_FUNCTION(0, callback);

    Baton* baton = new Baton(db, callback);
    db->Schedule(Work_Wait, baton, true);

    info.GetReturnValue().Set(info.This());
}

void Database::Work_Wait(Baton* baton) {
    Nan::HandleScope scope;

    assert(baton->db->locked);
    assert(baton->db->open);
    assert(baton->db->_handle);
    assert(baton->db->pending == 0);

    Local<Function> cb = Nan::New(baton->callback);
    if (!cb.IsEmpty() && cb->IsFunction()) {
        Local<Value> argv[] = { Nan::Null() };
        TRY_CATCH_CALL(baton->db->handle(), cb, 1, argv);
    }

    baton->db->Process();

    delete baton;
}

NAN_METHOD(Database::LoadExtension) {
    Database* db = Nan::ObjectWrap::Unwrap<Database>(info.This());

    REQUIRE_ARGUMENT_STRING(0, filename);
    OPTIONAL_ARGUMENT_FUNCTION(1, callback);

    Baton* baton = new LoadExtensionBaton(db, callback, *filename);
    db->Schedule(Work_BeginLoadExtension, baton, true);

    info.GetReturnValue().Set(info.This());
}

void Database::Work_BeginLoadExtension(Baton* baton) {
    assert(baton->db->locked);
    assert(baton->db->open);
    assert(baton->db->_handle);
    assert(baton->db->pending == 0);
    int status = uv_queue_work(uv_default_loop(),
        &baton->request, Work_LoadExtension, reinterpret_cast<uv_after_work_cb>(Work_AfterLoadExtension));
    assert(status == 0);
}

void Database::Work_LoadExtension(uv_work_t* req) {
    LoadExtensionBaton* baton = static_cast<LoadExtensionBaton*>(req->data);

    sqlite3_enable_load_extension(baton->db->_handle, 1);

    char* message = NULL;
    baton->status = sqlite3_load_extension(
        baton->db->_handle,
        baton->filename.c_str(),
        0,
        &message
    );

    sqlite3_enable_load_extension(baton->db->_handle, 0);

    if (baton->status != SQLITE_OK && message != NULL) {
        baton->message = std::string(message);
        sqlite3_free(message);
    }
}

void Database::Work_AfterLoadExtension(uv_work_t* req) {
    Nan::HandleScope scope;

    LoadExtensionBaton* baton = static_cast<LoadExtensionBaton*>(req->data);
    Database* db = baton->db;
    Local<Function> cb = Nan::New(baton->callback);

    if (baton->status != SQLITE_OK) {
        EXCEPTION(Nan::New(baton->message.c_str()).ToLocalChecked(), baton->status, exception);

        if (!cb.IsEmpty() && cb->IsFunction()) {
            Local<Value> argv[] = { exception };
            TRY_CATCH_CALL(db->handle(), cb, 1, argv);
        }
        else {
            Local<Value> info[] = { Nan::New("error").ToLocalChecked(), exception };
            EMIT_EVENT(db->handle(), 2, info);
        }
    }
    else if (!cb.IsEmpty() && cb->IsFunction()) {
        Local<Value> argv[] = { Nan::Null() };
        TRY_CATCH_CALL(db->handle(), cb, 1, argv);
    }

    db->Process();

    delete baton;
}

void Database::RemoveCallbacks() {
    if (debug_trace) {
        debug_trace->finish();
        debug_trace = NULL;
    }
    if (debug_profile) {
        debug_profile->finish();
        debug_profile = NULL;
    }
}
