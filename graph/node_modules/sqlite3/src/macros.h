#ifndef NODE_SQLITE3_SRC_MACROS_H
#define NODE_SQLITE3_SRC_MACROS_H

const char* sqlite_code_string(int code);
const char* sqlite_authorizer_string(int type);


#define REQUIRE_ARGUMENTS(n)                                                   \
    if (info.Length() < (n)) {                                                 \
        return Nan::ThrowTypeError("Expected " #n "arguments");                \
    }


#define REQUIRE_ARGUMENT_EXTERNAL(i, var)                                      \
    if (info.Length() <= (i) || !info[i]->IsExternal()) {                      \
        return Nan::ThrowTypeError("Argument " #i " invalid");                 \
    }                                                                          \
    Local<External> var = Local<External>::Cast(info[i]);


#define REQUIRE_ARGUMENT_FUNCTION(i, var)                                      \
    if (info.Length() <= (i) || !info[i]->IsFunction()) {                      \
        return Nan::ThrowTypeError("Argument " #i " must be a function");      \
    }                                                                          \
    Local<Function> var = Local<Function>::Cast(info[i]);


#define REQUIRE_ARGUMENT_STRING(i, var)                                        \
    if (info.Length() <= (i) || !info[i]->IsString()) {                        \
        return Nan::ThrowTypeError("Argument " #i " must be a string");        \
    }                                                                          \
    Nan::Utf8String var(info[i]);


#define OPTIONAL_ARGUMENT_FUNCTION(i, var)                                     \
    Local<Function> var;                                                       \
    if (info.Length() > i && !info[i]->IsUndefined()) {                        \
        if (!info[i]->IsFunction()) {                                          \
            return Nan::ThrowTypeError("Argument " #i " must be a function");  \
        }                                                                      \
        var = Local<Function>::Cast(info[i]);                                  \
    }


#define OPTIONAL_ARGUMENT_INTEGER(i, var, default)                             \
    int var;                                                                   \
    if (info.Length() <= (i)) {                                                \
        var = (default);                                                       \
    }                                                                          \
    else if (info[i]->IsInt32()) {                                             \
        var = Nan::To<int32_t>(info[i]).FromJust();                            \
    }                                                                          \
    else {                                                                     \
        return Nan::ThrowTypeError("Argument " #i " must be an integer");      \
    }


#define DEFINE_CONSTANT_INTEGER(target, constant, name)                        \
    Nan::ForceSet(target,                                                      \
        Nan::New(#name).ToLocalChecked(),                                      \
        Nan::New<Integer>(constant),                                           \
        static_cast<PropertyAttribute>(ReadOnly | DontDelete)                  \
    );

#define DEFINE_CONSTANT_STRING(target, constant, name)                         \
    Nan::ForceSet(target,                                                      \
        Nan::New(#name).ToLocalChecked(),                                      \
        Nan::New(constant).ToLocalChecked(),                                   \
        static_cast<PropertyAttribute>(ReadOnly | DontDelete)                  \
    );


#define NODE_SET_GETTER(target, name, function)                                \
    Nan::SetAccessor((target)->InstanceTemplate(),                             \
        Nan::New(name).ToLocalChecked(), (function));

#define GET_STRING(source, name, property)                                     \
    Nan::Utf8String name(Nan::Get(source,                                      \
        Nan::New(prop).ToLocalChecked()).ToLocalChecked());

#define GET_INTEGER(source, name, prop)                                        \
    int name = Nan::To<int>(Nan::Get(source,                                   \
        Nan::New(property).ToLocalChecked()).ToLocalChecked()).FromJust();

#define EXCEPTION(msg, errno, name)                                            \
    Local<Value> name = Exception::Error(                                      \
        String::Concat(                                                        \
            String::Concat(                                                    \
                Nan::New(sqlite_code_string(errno)).ToLocalChecked(),          \
                Nan::New(": ").ToLocalChecked()                                \
            ),                                                                 \
            (msg)                                                              \
        )                                                                      \
    );                                                                         \
    Local<Object> name ##_obj = name.As<Object>();                             \
    Nan::Set(name ##_obj, Nan::New("errno").ToLocalChecked(), Nan::New(errno));\
    Nan::Set(name ##_obj, Nan::New("code").ToLocalChecked(),                   \
        Nan::New(sqlite_code_string(errno)).ToLocalChecked());


#define EMIT_EVENT(obj, argc, argv)                                            \
    TRY_CATCH_CALL((obj),                                                      \
        Nan::Get(obj,                                                          \
            Nan::New("emit").ToLocalChecked()).ToLocalChecked().As<Function>(),\
        argc, argv                                                             \
    );

#define TRY_CATCH_CALL(context, callback, argc, argv)                          \
    Nan::MakeCallback((context), (callback), (argc), (argv))

#define WORK_DEFINITION(name)                                                  \
    static NAN_METHOD(name);                                                   \
    static void Work_Begin##name(Baton* baton);                                \
    static void Work_##name(uv_work_t* req);                                   \
    static void Work_After##name(uv_work_t* req);

#define STATEMENT_BEGIN(type)                                                  \
    assert(baton);                                                             \
    assert(baton->stmt);                                                       \
    assert(!baton->stmt->locked);                                              \
    assert(!baton->stmt->finalized);                                           \
    assert(baton->stmt->prepared);                                             \
    baton->stmt->locked = true;                                                \
    baton->stmt->db->pending++;                                                \
    int status = uv_queue_work(uv_default_loop(),                              \
        &baton->request,                                                       \
        Work_##type, reinterpret_cast<uv_after_work_cb>(Work_After##type));    \
    assert(status == 0);

#define STATEMENT_INIT(type)                                                   \
    type* baton = static_cast<type*>(req->data);                               \
    Statement* stmt = baton->stmt;

#define STATEMENT_END()                                                        \
    assert(stmt->locked);                                                      \
    assert(stmt->db->pending);                                                 \
    stmt->locked = false;                                                      \
    stmt->db->pending--;                                                       \
    stmt->Process();                                                           \
    stmt->db->Process();                                                       \
    delete baton;

#define DELETE_FIELD(field)                                                    \
    if (field != NULL) {                                                       \
        switch ((field)->type) {                                               \
            case SQLITE_INTEGER: delete (Values::Integer*)(field); break;      \
            case SQLITE_FLOAT:   delete (Values::Float*)(field); break;        \
            case SQLITE_TEXT:    delete (Values::Text*)(field); break;         \
            case SQLITE_BLOB:    delete (Values::Blob*)(field); break;         \
            case SQLITE_NULL:    delete (Values::Null*)(field); break;         \
        }                                                                      \
    }

#endif
