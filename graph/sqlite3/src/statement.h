#ifndef NODE_SQLITE3_SRC_STATEMENT_H
#define NODE_SQLITE3_SRC_STATEMENT_H


#include "database.h"
#include "threading.h"

#include <cstdlib>
#include <cstring>
#include <string>
#include <queue>
#include <vector>

#include <sqlite3.h>
#include <nan.h>

using namespace v8;
using namespace node;

namespace node_sqlite3 {

namespace Values {
    struct Field {
        inline Field(unsigned short _index, unsigned short _type = SQLITE_NULL) :
            type(_type), index(_index) {}
        inline Field(const char* _name, unsigned short _type = SQLITE_NULL) :
            type(_type), index(0), name(_name) {}

        unsigned short type;
        unsigned short index;
        std::string name;
    };

    struct Integer : Field {
        template <class T> inline Integer(T _name, int64_t val) :
            Field(_name, SQLITE_INTEGER), value(val) {}
        int64_t value;
    };

    struct Float : Field {
        template <class T> inline Float(T _name, double val) :
            Field(_name, SQLITE_FLOAT), value(val) {}
        double value;
    };

    struct Text : Field {
        template <class T> inline Text(T _name, size_t len, const char* val) :
            Field(_name, SQLITE_TEXT), value(val, len) {}
        std::string value;
    };

    struct Blob : Field {
        template <class T> inline Blob(T _name, size_t len, const void* val) :
                Field(_name, SQLITE_BLOB), length(len) {
            value = (char*)malloc(len);
            memcpy(value, val, len);
        }
        inline ~Blob() {
            free(value);
        }
        int length;
        char* value;
    };

    typedef Field Null;
}

typedef std::vector<Values::Field*> Row;
typedef std::vector<Row*> Rows;
typedef Row Parameters;



class Statement : public Nan::ObjectWrap {
public:
    static Nan::Persistent<FunctionTemplate> constructor_template;

    static NAN_MODULE_INIT(Init);
    static NAN_METHOD(New);

    struct Baton {
        uv_work_t request;
        Statement* stmt;
        Nan::Persistent<Function> callback;
        Parameters parameters;

        Baton(Statement* stmt_, Local<Function> cb_) : stmt(stmt_) {
            stmt->Ref();
            request.data = this;
            callback.Reset(cb_);
        }
        virtual ~Baton() {
            for (unsigned int i = 0; i < parameters.size(); i++) {
                Values::Field* field = parameters[i];
                DELETE_FIELD(field);
            }
            stmt->Unref();
            callback.Reset();
        }
    };

    struct RowBaton : Baton {
        RowBaton(Statement* stmt_, Local<Function> cb_) :
            Baton(stmt_, cb_) {}
        Row row;
    };

    struct RunBaton : Baton {
        RunBaton(Statement* stmt_, Local<Function> cb_) :
            Baton(stmt_, cb_), inserted_id(0), changes(0) {}
        sqlite3_int64 inserted_id;
        int changes;
    };

    struct RowsBaton : Baton {
        RowsBaton(Statement* stmt_, Local<Function> cb_) :
            Baton(stmt_, cb_) {}
        Rows rows;
    };

    struct Async;

    struct EachBaton : Baton {
        Nan::Persistent<Function> completed;
        Async* async; // Isn't deleted when the baton is deleted.

        EachBaton(Statement* stmt_, Local<Function> cb_) :
            Baton(stmt_, cb_) {}
        virtual ~EachBaton() {
            completed.Reset();
        }
    };

    struct PrepareBaton : Database::Baton {
        Statement* stmt;
        std::string sql;
        PrepareBaton(Database* db_, Local<Function> cb_, Statement* stmt_) :
            Baton(db_, cb_), stmt(stmt_) {
            stmt->Ref();
        }
        virtual ~PrepareBaton() {
            stmt->Unref();
            if (!db->IsOpen() && db->IsLocked()) {
                // The database handle was closed before the statement could be
                // prepared.
                stmt->Finalize();
            }
        }
    };

    typedef void (*Work_Callback)(Baton* baton);

    struct Call {
        Call(Work_Callback cb_, Baton* baton_) : callback(cb_), baton(baton_) {};
        Work_Callback callback;
        Baton* baton;
    };

    struct Async {
        uv_async_t watcher;
        Statement* stmt;
        Rows data;
        NODE_SQLITE3_MUTEX_t;
        bool completed;
        int retrieved;

        // Store the callbacks here because we don't have
        // access to the baton in the async callback.
        Nan::Persistent<Function> item_cb;
        Nan::Persistent<Function> completed_cb;

        Async(Statement* st, uv_async_cb async_cb) :
                stmt(st), completed(false), retrieved(0) {
            watcher.data = this;
            NODE_SQLITE3_MUTEX_INIT
            stmt->Ref();
            uv_async_init(uv_default_loop(), &watcher, async_cb);
        }

        ~Async() {
            stmt->Unref();
            item_cb.Reset();
            completed_cb.Reset();
            NODE_SQLITE3_MUTEX_DESTROY
        }
    };

    Statement(Database* db_) : Nan::ObjectWrap(),
            db(db_),
            _handle(NULL),
            status(SQLITE_OK),
            prepared(false),
            locked(true),
            finalized(false) {
        db->Ref();
    }

    ~Statement() {
        if (!finalized) Finalize();
    }

    WORK_DEFINITION(Bind);
    WORK_DEFINITION(Get);
    WORK_DEFINITION(Run);
    WORK_DEFINITION(All);
    WORK_DEFINITION(Each);
    WORK_DEFINITION(Reset);

    static NAN_METHOD(Finalize);

protected:
    static void Work_BeginPrepare(Database::Baton* baton);
    static void Work_Prepare(uv_work_t* req);
    static void Work_AfterPrepare(uv_work_t* req);

    static void AsyncEach(uv_async_t* handle, int status);
    static void CloseCallback(uv_handle_t* handle);

    static void Finalize(Baton* baton);
    void Finalize();

    template <class T> inline Values::Field* BindParameter(const Local<Value> source, T pos);
    template <class T> T* Bind(Nan::NAN_METHOD_ARGS_TYPE info, int start = 0, int end = -1);
    bool Bind(const Parameters &parameters);

    static void GetRow(Row* row, sqlite3_stmt* stmt);
    static Local<Object> RowToJS(Row* row);
    void Schedule(Work_Callback callback, Baton* baton);
    void Process();
    void CleanQueue();
    template <class T> static void Error(T* baton);

protected:
    Database* db;

    sqlite3_stmt* _handle;
    int status;
    std::string message;

    bool prepared;
    bool locked;
    bool finalized;
    std::queue<Call*> queue;
};

}

#endif
