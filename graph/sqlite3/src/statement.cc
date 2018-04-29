#include <string.h>
#include <node.h>
#include <node_buffer.h>
#include <node_version.h>

#include "macros.h"
#include "database.h"
#include "statement.h"

using namespace node_sqlite3;

Nan::Persistent<FunctionTemplate> Statement::constructor_template;

NAN_MODULE_INIT(Statement::Init) {
    Nan::HandleScope scope;

    Local<FunctionTemplate> t = Nan::New<FunctionTemplate>(New);

    t->InstanceTemplate()->SetInternalFieldCount(1);
    t->SetClassName(Nan::New("Statement").ToLocalChecked());

    Nan::SetPrototypeMethod(t, "bind", Bind);
    Nan::SetPrototypeMethod(t, "get", Get);
    Nan::SetPrototypeMethod(t, "run", Run);
    Nan::SetPrototypeMethod(t, "all", All);
    Nan::SetPrototypeMethod(t, "each", Each);
    Nan::SetPrototypeMethod(t, "reset", Reset);
    Nan::SetPrototypeMethod(t, "finalize", Finalize);

    constructor_template.Reset(t);
    Nan::Set(target, Nan::New("Statement").ToLocalChecked(),
        Nan::GetFunction(t).ToLocalChecked());
}

void Statement::Process() {
    if (finalized && !queue.empty()) {
        return CleanQueue();
    }

    while (prepared && !locked && !queue.empty()) {
        Call* call = queue.front();
        queue.pop();

        call->callback(call->baton);
        delete call;
    }
}

void Statement::Schedule(Work_Callback callback, Baton* baton) {
    if (finalized) {
        queue.push(new Call(callback, baton));
        CleanQueue();
    }
    else if (!prepared || locked) {
        queue.push(new Call(callback, baton));
    }
    else {
        callback(baton);
    }
}

template <class T> void Statement::Error(T* baton) {
    Nan::HandleScope scope;

    Statement* stmt = baton->stmt;
    // Fail hard on logic errors.
    assert(stmt->status != 0);
    EXCEPTION(Nan::New(stmt->message.c_str()).ToLocalChecked(), stmt->status, exception);

    Local<Function> cb = Nan::New(baton->callback);

    if (!cb.IsEmpty() && cb->IsFunction()) {
        Local<Value> argv[] = { exception };
        TRY_CATCH_CALL(stmt->handle(), cb, 1, argv);
    }
    else {
        Local<Value> argv[] = { Nan::New("error").ToLocalChecked(), exception };
        EMIT_EVENT(stmt->handle(), 2, argv);
    }
}

// { Database db, String sql, Array params, Function callback }
NAN_METHOD(Statement::New) {
    if (!info.IsConstructCall()) {
        return Nan::ThrowTypeError("Use the new operator to create new Statement objects");
    }

    int length = info.Length();

    if (length <= 0 || !Database::HasInstance(info[0])) {
        return Nan::ThrowTypeError("Database object expected");
    }
    else if (length <= 1 || !info[1]->IsString()) {
        return Nan::ThrowTypeError("SQL query expected");
    }
    else if (length > 2 && !info[2]->IsUndefined() && !info[2]->IsFunction()) {
        return Nan::ThrowTypeError("Callback expected");
    }

    Database* db = Nan::ObjectWrap::Unwrap<Database>(info[0].As<Object>());
    Local<String> sql = Local<String>::Cast(info[1]);

    Nan::ForceSet(info.This(),Nan::New("sql").ToLocalChecked(), sql, ReadOnly);

    Statement* stmt = new Statement(db);
    stmt->Wrap(info.This());

    PrepareBaton* baton = new PrepareBaton(db, Local<Function>::Cast(info[2]), stmt);
    baton->sql = std::string(*Nan::Utf8String(sql));
    db->Schedule(Work_BeginPrepare, baton);

    info.GetReturnValue().Set(info.This());
}

void Statement::Work_BeginPrepare(Database::Baton* baton) {
    assert(baton->db->open);
    baton->db->pending++;
    int status = uv_queue_work(uv_default_loop(),
        &baton->request, Work_Prepare, (uv_after_work_cb)Work_AfterPrepare);
    assert(status == 0);
}

void Statement::Work_Prepare(uv_work_t* req) {
    STATEMENT_INIT(PrepareBaton);

    // In case preparing fails, we use a mutex to make sure we get the associated
    // error message.
    sqlite3_mutex* mtx = sqlite3_db_mutex(baton->db->_handle);
    sqlite3_mutex_enter(mtx);

    stmt->status = sqlite3_prepare_v2(
        baton->db->_handle,
        baton->sql.c_str(),
        baton->sql.size(),
        &stmt->_handle,
        NULL
    );

    if (stmt->status != SQLITE_OK) {
        stmt->message = std::string(sqlite3_errmsg(baton->db->_handle));
        stmt->_handle = NULL;
    }

    sqlite3_mutex_leave(mtx);
}

void Statement::Work_AfterPrepare(uv_work_t* req) {
    Nan::HandleScope scope;

    STATEMENT_INIT(PrepareBaton);

    if (stmt->status != SQLITE_OK) {
        Error(baton);
        stmt->Finalize();
    }
    else {
        stmt->prepared = true;
        Local<Function> cb = Nan::New(baton->callback);
        if (!cb.IsEmpty() && cb->IsFunction()) {
            Local<Value> argv[] = { Nan::Null() };
            TRY_CATCH_CALL(stmt->handle(), cb, 1, argv);
        }
    }

    STATEMENT_END();
}

template <class T> Values::Field*
                   Statement::BindParameter(const Local<Value> source, T pos) {
    if (source->IsString() || source->IsRegExp()) {
        Nan::Utf8String val(source);
        return new Values::Text(pos, val.length(), *val);
    }
    else if (source->IsInt32()) {
        return new Values::Integer(pos, Nan::To<int32_t>(source).FromJust());
    }
    else if (source->IsNumber()) {
        return new Values::Float(pos, Nan::To<double>(source).FromJust());
    }
    else if (source->IsBoolean()) {
        return new Values::Integer(pos, Nan::To<bool>(source).FromJust() ? 1 : 0);
    }
    else if (source->IsNull()) {
        return new Values::Null(pos);
    }
    else if (Buffer::HasInstance(source)) {
        Local<Object> buffer = Nan::To<Object>(source).ToLocalChecked();
        return new Values::Blob(pos, Buffer::Length(buffer), Buffer::Data(buffer));
    }
    else if (source->IsDate()) {
        return new Values::Float(pos, Nan::To<double>(source).FromJust());
    }
    else {
        return NULL;
    }
}

template <class T> T* Statement::Bind(Nan::NAN_METHOD_ARGS_TYPE info, int start, int last) {
    Nan::HandleScope scope;

    if (last < 0) last = info.Length();
    Local<Function> callback;
    if (last > start && info[last - 1]->IsFunction()) {
        callback = Local<Function>::Cast(info[last - 1]);
        last--;
    }

    T* baton = new T(this, callback);

    if (start < last) {
        if (info[start]->IsArray()) {
            Local<Array> array = Local<Array>::Cast(info[start]);
            int length = array->Length();
            // Note: bind parameters start with 1.
            for (int i = 0, pos = 1; i < length; i++, pos++) {
                baton->parameters.push_back(BindParameter(Nan::Get(array, i).ToLocalChecked(), pos));
            }
        }
        else if (!info[start]->IsObject() || info[start]->IsRegExp() || info[start]->IsDate() || Buffer::HasInstance(info[start])) {
            // Parameters directly in array.
            // Note: bind parameters start with 1.
            for (int i = start, pos = 1; i < last; i++, pos++) {
                baton->parameters.push_back(BindParameter(info[i], pos));
            }
        }
        else if (info[start]->IsObject()) {
            Local<Object> object = Local<Object>::Cast(info[start]);
            Local<Array> array = Nan::GetPropertyNames(object).ToLocalChecked();
            int length = array->Length();
            for (int i = 0; i < length; i++) {
                Local<Value> name = Nan::Get(array, i).ToLocalChecked();

                if (name->IsInt32()) {
                    baton->parameters.push_back(
                        BindParameter(Nan::Get(object, name).ToLocalChecked(), Nan::To<int32_t>(name).FromJust()));
                }
                else {
                    baton->parameters.push_back(BindParameter(Nan::Get(object, name).ToLocalChecked(),
                        *Nan::Utf8String(name)));
                }
            }
        }
        else {
            return NULL;
        }
    }

    return baton;
}

bool Statement::Bind(const Parameters & parameters) {
    if (parameters.size() == 0) {
        return true;
    }

    sqlite3_reset(_handle);
    sqlite3_clear_bindings(_handle);

    Parameters::const_iterator it = parameters.begin();
    Parameters::const_iterator end = parameters.end();

    for (; it < end; ++it) {
        Values::Field* field = *it;

        if (field != NULL) {
            int pos;
            if (field->index > 0) {
                pos = field->index;
            }
            else {
                pos = sqlite3_bind_parameter_index(_handle, field->name.c_str());
            }

            switch (field->type) {
                case SQLITE_INTEGER: {
                    status = sqlite3_bind_int(_handle, pos,
                        ((Values::Integer*)field)->value);
                } break;
                case SQLITE_FLOAT: {
                    status = sqlite3_bind_double(_handle, pos,
                        ((Values::Float*)field)->value);
                } break;
                case SQLITE_TEXT: {
                    status = sqlite3_bind_text(_handle, pos,
                        ((Values::Text*)field)->value.c_str(),
                        ((Values::Text*)field)->value.size(), SQLITE_TRANSIENT);
                } break;
                case SQLITE_BLOB: {
                    status = sqlite3_bind_blob(_handle, pos,
                        ((Values::Blob*)field)->value,
                        ((Values::Blob*)field)->length, SQLITE_TRANSIENT);
                } break;
                case SQLITE_NULL: {
                    status = sqlite3_bind_null(_handle, pos);
                } break;
            }

            if (status != SQLITE_OK) {
                message = std::string(sqlite3_errmsg(db->_handle));
                return false;
            }
        }
    }

    return true;
}

NAN_METHOD(Statement::Bind) {
    Statement* stmt = Nan::ObjectWrap::Unwrap<Statement>(info.This());

    Baton* baton = stmt->Bind<Baton>(info);
    if (baton == NULL) {
        return Nan::ThrowTypeError("Data type is not supported");
    }
    else {
        stmt->Schedule(Work_BeginBind, baton);
        info.GetReturnValue().Set(info.This());
    }
}

void Statement::Work_BeginBind(Baton* baton) {
    STATEMENT_BEGIN(Bind);
}

void Statement::Work_Bind(uv_work_t* req) {
    STATEMENT_INIT(Baton);

    sqlite3_mutex* mtx = sqlite3_db_mutex(stmt->db->_handle);
    sqlite3_mutex_enter(mtx);
    stmt->Bind(baton->parameters);
    sqlite3_mutex_leave(mtx);
}

void Statement::Work_AfterBind(uv_work_t* req) {
    Nan::HandleScope scope;

    STATEMENT_INIT(Baton);

    if (stmt->status != SQLITE_OK) {
        Error(baton);
    }
    else {
        // Fire callbacks.
        Local<Function> cb = Nan::New(baton->callback);
        if (!cb.IsEmpty() && cb->IsFunction()) {
            Local<Value> argv[] = { Nan::Null() };
            TRY_CATCH_CALL(stmt->handle(), cb, 1, argv);
        }
    }

    STATEMENT_END();
}



NAN_METHOD(Statement::Get) {
    Statement* stmt = Nan::ObjectWrap::Unwrap<Statement>(info.This());

    Baton* baton = stmt->Bind<RowBaton>(info);
    if (baton == NULL) {
        return Nan::ThrowError("Data type is not supported");
    }
    else {
        stmt->Schedule(Work_BeginGet, baton);
        info.GetReturnValue().Set(info.This());
    }
}

void Statement::Work_BeginGet(Baton* baton) {
    STATEMENT_BEGIN(Get);
}

void Statement::Work_Get(uv_work_t* req) {
    STATEMENT_INIT(RowBaton);

    if (stmt->status != SQLITE_DONE || baton->parameters.size()) {
        sqlite3_mutex* mtx = sqlite3_db_mutex(stmt->db->_handle);
        sqlite3_mutex_enter(mtx);

        if (stmt->Bind(baton->parameters)) {
            stmt->status = sqlite3_step(stmt->_handle);

            if (!(stmt->status == SQLITE_ROW || stmt->status == SQLITE_DONE)) {
                stmt->message = std::string(sqlite3_errmsg(stmt->db->_handle));
            }
        }

        sqlite3_mutex_leave(mtx);

        if (stmt->status == SQLITE_ROW) {
            // Acquire one result row before returning.
            GetRow(&baton->row, stmt->_handle);
        }
    }
}

void Statement::Work_AfterGet(uv_work_t* req) {
    Nan::HandleScope scope;

    STATEMENT_INIT(RowBaton);

    if (stmt->status != SQLITE_ROW && stmt->status != SQLITE_DONE) {
        Error(baton);
    }
    else {
        // Fire callbacks.
        Local<Function> cb = Nan::New(baton->callback);
        if (!cb.IsEmpty() && cb->IsFunction()) {
            if (stmt->status == SQLITE_ROW) {
                // Create the result array from the data we acquired.
                Local<Value> argv[] = { Nan::Null(), RowToJS(&baton->row) };
                TRY_CATCH_CALL(stmt->handle(), cb, 2, argv);
            }
            else {
                Local<Value> argv[] = { Nan::Null() };
                TRY_CATCH_CALL(stmt->handle(), cb, 1, argv);
            }
        }
    }

    STATEMENT_END();
}

NAN_METHOD(Statement::Run) {
    Statement* stmt = Nan::ObjectWrap::Unwrap<Statement>(info.This());

    Baton* baton = stmt->Bind<RunBaton>(info);
    if (baton == NULL) {
        return Nan::ThrowError("Data type is not supported");
    }
    else {
        stmt->Schedule(Work_BeginRun, baton);
        info.GetReturnValue().Set(info.This());
    }
}

void Statement::Work_BeginRun(Baton* baton) {
    STATEMENT_BEGIN(Run);
}

void Statement::Work_Run(uv_work_t* req) {
    STATEMENT_INIT(RunBaton);

    sqlite3_mutex* mtx = sqlite3_db_mutex(stmt->db->_handle);
    sqlite3_mutex_enter(mtx);

    // Make sure that we also reset when there are no parameters.
    if (!baton->parameters.size()) {
        sqlite3_reset(stmt->_handle);
    }

    if (stmt->Bind(baton->parameters)) {
        stmt->status = sqlite3_step(stmt->_handle);

        if (!(stmt->status == SQLITE_ROW || stmt->status == SQLITE_DONE)) {
            stmt->message = std::string(sqlite3_errmsg(stmt->db->_handle));
        }
        else {
            baton->inserted_id = sqlite3_last_insert_rowid(stmt->db->_handle);
            baton->changes = sqlite3_changes(stmt->db->_handle);
        }
    }

    sqlite3_mutex_leave(mtx);
}

void Statement::Work_AfterRun(uv_work_t* req) {
    Nan::HandleScope scope;

    STATEMENT_INIT(RunBaton);

    if (stmt->status != SQLITE_ROW && stmt->status != SQLITE_DONE) {
        Error(baton);
    }
    else {
        // Fire callbacks.
        Local<Function> cb = Nan::New(baton->callback);
        if (!cb.IsEmpty() && cb->IsFunction()) {
            Nan::Set(stmt->handle(), Nan::New("lastID").ToLocalChecked(), Nan::New<Number>(baton->inserted_id));
            Nan::Set(stmt->handle(), Nan::New("changes").ToLocalChecked(), Nan::New(baton->changes));

            Local<Value> argv[] = { Nan::Null() };
            TRY_CATCH_CALL(stmt->handle(), cb, 1, argv);
        }
    }

    STATEMENT_END();
}

NAN_METHOD(Statement::All) {
    Statement* stmt = Nan::ObjectWrap::Unwrap<Statement>(info.This());

    Baton* baton = stmt->Bind<RowsBaton>(info);
    if (baton == NULL) {
        return Nan::ThrowError("Data type is not supported");
    }
    else {
        stmt->Schedule(Work_BeginAll, baton);
        info.GetReturnValue().Set(info.This());
    }
}

void Statement::Work_BeginAll(Baton* baton) {
    STATEMENT_BEGIN(All);
}

void Statement::Work_All(uv_work_t* req) {
    STATEMENT_INIT(RowsBaton);

    sqlite3_mutex* mtx = sqlite3_db_mutex(stmt->db->_handle);
    sqlite3_mutex_enter(mtx);

    // Make sure that we also reset when there are no parameters.
    if (!baton->parameters.size()) {
        sqlite3_reset(stmt->_handle);
    }

    if (stmt->Bind(baton->parameters)) {
        while ((stmt->status = sqlite3_step(stmt->_handle)) == SQLITE_ROW) {
            Row* row = new Row();
            GetRow(row, stmt->_handle);
            baton->rows.push_back(row);
        }

        if (stmt->status != SQLITE_DONE) {
            stmt->message = std::string(sqlite3_errmsg(stmt->db->_handle));
        }
    }

    sqlite3_mutex_leave(mtx);
}

void Statement::Work_AfterAll(uv_work_t* req) {
    Nan::HandleScope scope;

    STATEMENT_INIT(RowsBaton);

    if (stmt->status != SQLITE_DONE) {
        Error(baton);
    }
    else {
        // Fire callbacks.
        Local<Function> cb = Nan::New(baton->callback);
        if (!cb.IsEmpty() && cb->IsFunction()) {
            if (baton->rows.size()) {
                // Create the result array from the data we acquired.
                Local<Array> result(Nan::New<Array>(baton->rows.size()));
                Rows::const_iterator it = baton->rows.begin();
                Rows::const_iterator end = baton->rows.end();
                for (int i = 0; it < end; ++it, i++) {
                    Nan::Set(result, i, RowToJS(*it));
                    delete *it;
                }

                Local<Value> argv[] = { Nan::Null(), result };
                TRY_CATCH_CALL(stmt->handle(), cb, 2, argv);
            }
            else {
                // There were no result rows.
                Local<Value> argv[] = {
                    Nan::Null(),
                    Nan::New<Array>(0)
                };
                TRY_CATCH_CALL(stmt->handle(), cb, 2, argv);
            }
        }
    }

    STATEMENT_END();
}

NAN_METHOD(Statement::Each) {
    Statement* stmt = Nan::ObjectWrap::Unwrap<Statement>(info.This());

    int last = info.Length();

    Local<Function> completed;
    if (last >= 2 && info[last - 1]->IsFunction() && info[last - 2]->IsFunction()) {
        completed = Local<Function>::Cast(info[--last]);
    }

    EachBaton* baton = stmt->Bind<EachBaton>(info, 0, last);
    if (baton == NULL) {
        return Nan::ThrowError("Data type is not supported");
    }
    else {
        baton->completed.Reset(completed);
        stmt->Schedule(Work_BeginEach, baton);
        info.GetReturnValue().Set(info.This());
    }
}

void Statement::Work_BeginEach(Baton* baton) {
    // Only create the Async object when we're actually going into
    // the event loop. This prevents dangling events.
    EachBaton* each_baton = static_cast<EachBaton*>(baton);
    each_baton->async = new Async(each_baton->stmt, reinterpret_cast<uv_async_cb>(AsyncEach));
    each_baton->async->item_cb.Reset(each_baton->callback);
    each_baton->async->completed_cb.Reset(each_baton->completed);

    STATEMENT_BEGIN(Each);
}

void Statement::Work_Each(uv_work_t* req) {
    STATEMENT_INIT(EachBaton);

    Async* async = baton->async;

    sqlite3_mutex* mtx = sqlite3_db_mutex(stmt->db->_handle);

    int retrieved = 0;

    // Make sure that we also reset when there are no parameters.
    if (!baton->parameters.size()) {
        sqlite3_reset(stmt->_handle);
    }

    if (stmt->Bind(baton->parameters)) {
        while (true) {
            sqlite3_mutex_enter(mtx);
            stmt->status = sqlite3_step(stmt->_handle);
            if (stmt->status == SQLITE_ROW) {
                sqlite3_mutex_leave(mtx);
                Row* row = new Row();
                GetRow(row, stmt->_handle);
                NODE_SQLITE3_MUTEX_LOCK(&async->mutex)
                async->data.push_back(row);
                retrieved++;
                NODE_SQLITE3_MUTEX_UNLOCK(&async->mutex)

                uv_async_send(&async->watcher);
            }
            else {
                if (stmt->status != SQLITE_DONE) {
                    stmt->message = std::string(sqlite3_errmsg(stmt->db->_handle));
                }
                sqlite3_mutex_leave(mtx);
                break;
            }
        }
    }

    async->completed = true;
    uv_async_send(&async->watcher);
}

void Statement::CloseCallback(uv_handle_t* handle) {
    assert(handle != NULL);
    assert(handle->data != NULL);
    Async* async = static_cast<Async*>(handle->data);
    delete async;
}

void Statement::AsyncEach(uv_async_t* handle, int status) {
    Nan::HandleScope scope;

    Async* async = static_cast<Async*>(handle->data);

    while (true) {
        // Get the contents out of the data cache for us to process in the JS callback.
        Rows rows;
        NODE_SQLITE3_MUTEX_LOCK(&async->mutex)
        rows.swap(async->data);
        NODE_SQLITE3_MUTEX_UNLOCK(&async->mutex)

        if (rows.empty()) {
            break;
        }

        Local<Function> cb = Nan::New(async->item_cb);
        if (!cb.IsEmpty() && cb->IsFunction()) {
            Local<Value> argv[2];
            argv[0] = Nan::Null();

            Rows::const_iterator it = rows.begin();
            Rows::const_iterator end = rows.end();
            for (int i = 0; it < end; ++it, i++) {
                argv[1] = RowToJS(*it);
                async->retrieved++;
                TRY_CATCH_CALL(async->stmt->handle(), cb, 2, argv);
                delete *it;
            }
        }
    }

    Local<Function> cb = Nan::New(async->completed_cb);
    if (async->completed) {
        if (!cb.IsEmpty() &&
                cb->IsFunction()) {
            Local<Value> argv[] = {
                Nan::Null(),
                Nan::New(async->retrieved)
            };
            TRY_CATCH_CALL(async->stmt->handle(), cb, 2, argv);
        }
        uv_close(reinterpret_cast<uv_handle_t*>(handle), CloseCallback);
    }
}

void Statement::Work_AfterEach(uv_work_t* req) {
    Nan::HandleScope scope;

    STATEMENT_INIT(EachBaton);

    if (stmt->status != SQLITE_DONE) {
        Error(baton);
    }

    STATEMENT_END();
}

NAN_METHOD(Statement::Reset) {
    Statement* stmt = Nan::ObjectWrap::Unwrap<Statement>(info.This());

    OPTIONAL_ARGUMENT_FUNCTION(0, callback);

    Baton* baton = new Baton(stmt, callback);
    stmt->Schedule(Work_BeginReset, baton);

    info.GetReturnValue().Set(info.This());
}

void Statement::Work_BeginReset(Baton* baton) {
    STATEMENT_BEGIN(Reset);
}

void Statement::Work_Reset(uv_work_t* req) {
    STATEMENT_INIT(Baton);

    sqlite3_reset(stmt->_handle);
    stmt->status = SQLITE_OK;
}

void Statement::Work_AfterReset(uv_work_t* req) {
    Nan::HandleScope scope;

    STATEMENT_INIT(Baton);

    // Fire callbacks.
    Local<Function> cb = Nan::New(baton->callback);
    if (!cb.IsEmpty() && cb->IsFunction()) {
        Local<Value> argv[] = { Nan::Null() };
        TRY_CATCH_CALL(stmt->handle(), cb, 1, argv);
    }

    STATEMENT_END();
}

Local<Object> Statement::RowToJS(Row* row) {
    Nan::EscapableHandleScope scope;

    Local<Object> result = Nan::New<Object>();

    Row::const_iterator it = row->begin();
    Row::const_iterator end = row->end();
    for (int i = 0; it < end; ++it, i++) {
        Values::Field* field = *it;

        Local<Value> value;

        switch (field->type) {
            case SQLITE_INTEGER: {
                value = Nan::New<Number>(((Values::Integer*)field)->value);
            } break;
            case SQLITE_FLOAT: {
                value = Nan::New<Number>(((Values::Float*)field)->value);
            } break;
            case SQLITE_TEXT: {
                value = Nan::New<String>(((Values::Text*)field)->value.c_str(), ((Values::Text*)field)->value.size()).ToLocalChecked();
            } break;
            case SQLITE_BLOB: {
                value = Nan::CopyBuffer(((Values::Blob*)field)->value, ((Values::Blob*)field)->length).ToLocalChecked();
            } break;
            case SQLITE_NULL: {
                value = Nan::Null();
            } break;
        }

        Nan::Set(result, Nan::New(field->name.c_str()).ToLocalChecked(), value);

        DELETE_FIELD(field);
    }

    return scope.Escape(result);
}

void Statement::GetRow(Row* row, sqlite3_stmt* stmt) {
    int rows = sqlite3_column_count(stmt);

    for (int i = 0; i < rows; i++) {
        int type = sqlite3_column_type(stmt, i);
        const char* name = sqlite3_column_name(stmt, i);
        switch (type) {
            case SQLITE_INTEGER: {
                row->push_back(new Values::Integer(name, sqlite3_column_int64(stmt, i)));
            }   break;
            case SQLITE_FLOAT: {
                row->push_back(new Values::Float(name, sqlite3_column_double(stmt, i)));
            }   break;
            case SQLITE_TEXT: {
                const char* text = (const char*)sqlite3_column_text(stmt, i);
                int length = sqlite3_column_bytes(stmt, i);
                row->push_back(new Values::Text(name, length, text));
            } break;
            case SQLITE_BLOB: {
                const void* blob = sqlite3_column_blob(stmt, i);
                int length = sqlite3_column_bytes(stmt, i);
                row->push_back(new Values::Blob(name, length, blob));
            }   break;
            case SQLITE_NULL: {
                row->push_back(new Values::Null(name));
            }   break;
            default:
                assert(false);
        }
    }
}

NAN_METHOD(Statement::Finalize) {
    Statement* stmt = Nan::ObjectWrap::Unwrap<Statement>(info.This());
    OPTIONAL_ARGUMENT_FUNCTION(0, callback);

    Baton* baton = new Baton(stmt, callback);
    stmt->Schedule(Finalize, baton);

    info.GetReturnValue().Set(stmt->db->handle());
}

void Statement::Finalize(Baton* baton) {
    Nan::HandleScope scope;

    baton->stmt->Finalize();

    // Fire callback in case there was one.
    Local<Function> cb = Nan::New(baton->callback);
    if (!cb.IsEmpty() && cb->IsFunction()) {
        TRY_CATCH_CALL(baton->stmt->handle(), cb, 0, NULL);
    }

    delete baton;
}

void Statement::Finalize() {
    assert(!finalized);
    finalized = true;
    CleanQueue();
    // Finalize returns the status code of the last operation. We already fired
    // error events in case those failed.
    sqlite3_finalize(_handle);
    _handle = NULL;
    db->Unref();
}

void Statement::CleanQueue() {
    Nan::HandleScope scope;

    if (prepared && !queue.empty()) {
        // This statement has already been prepared and is now finalized.
        // Fire error for all remaining items in the queue.
        EXCEPTION(Nan::New<String>("Statement is already finalized").ToLocalChecked(), SQLITE_MISUSE, exception);
        Local<Value> argv[] = { exception };
        bool called = false;

        // Clear out the queue so that this object can get GC'ed.
        while (!queue.empty()) {
            Call* call = queue.front();
            queue.pop();

            Local<Function> cb = Nan::New(call->baton->callback);

            if (prepared && !cb.IsEmpty() &&
                cb->IsFunction()) {
                TRY_CATCH_CALL(handle(), cb, 1, argv);
                called = true;
            }

            // We don't call the actual callback, so we have to make sure that
            // the baton gets destroyed.
            delete call->baton;
            delete call;
        }

        // When we couldn't call a callback function, emit an error on the
        // Statement object.
        if (!called) {
            Local<Value> info[] = { Nan::New("error").ToLocalChecked(), exception };
            EMIT_EVENT(handle(), 2, info);
        }
    }
    else while (!queue.empty()) {
        // Just delete all items in the queue; we already fired an event when
        // preparing the statement failed.
        Call* call = queue.front();
        queue.pop();

        // We don't call the actual callback, so we have to make sure that
        // the baton gets destroyed.
        delete call->baton;
        delete call;
    }
}
