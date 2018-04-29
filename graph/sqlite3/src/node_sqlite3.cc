#include <stdint.h>
#include <sstream>
#include <cstring>
#include <string>
#include <sqlite3.h>

#include "macros.h"
#include "database.h"
#include "statement.h"

using namespace node_sqlite3;

namespace {

NAN_MODULE_INIT(RegisterModule) {
    Nan::HandleScope scope;

    Database::Init(target);
    Statement::Init(target);

    DEFINE_CONSTANT_INTEGER(target, SQLITE_OPEN_READONLY, OPEN_READONLY);
    DEFINE_CONSTANT_INTEGER(target, SQLITE_OPEN_READWRITE, OPEN_READWRITE);
    DEFINE_CONSTANT_INTEGER(target, SQLITE_OPEN_CREATE, OPEN_CREATE);
    DEFINE_CONSTANT_STRING(target, SQLITE_VERSION, VERSION);
#ifdef SQLITE_SOURCE_ID
    DEFINE_CONSTANT_STRING(target, SQLITE_SOURCE_ID, SOURCE_ID);
#endif
    DEFINE_CONSTANT_INTEGER(target, SQLITE_VERSION_NUMBER, VERSION_NUMBER);

    DEFINE_CONSTANT_INTEGER(target, SQLITE_OK, OK);
    DEFINE_CONSTANT_INTEGER(target, SQLITE_ERROR, ERROR);
    DEFINE_CONSTANT_INTEGER(target, SQLITE_INTERNAL, INTERNAL);
    DEFINE_CONSTANT_INTEGER(target, SQLITE_PERM, PERM);
    DEFINE_CONSTANT_INTEGER(target, SQLITE_ABORT, ABORT);
    DEFINE_CONSTANT_INTEGER(target, SQLITE_BUSY, BUSY);
    DEFINE_CONSTANT_INTEGER(target, SQLITE_LOCKED, LOCKED);
    DEFINE_CONSTANT_INTEGER(target, SQLITE_NOMEM, NOMEM);
    DEFINE_CONSTANT_INTEGER(target, SQLITE_READONLY, READONLY);
    DEFINE_CONSTANT_INTEGER(target, SQLITE_INTERRUPT, INTERRUPT);
    DEFINE_CONSTANT_INTEGER(target, SQLITE_IOERR, IOERR);
    DEFINE_CONSTANT_INTEGER(target, SQLITE_CORRUPT, CORRUPT);
    DEFINE_CONSTANT_INTEGER(target, SQLITE_NOTFOUND, NOTFOUND);
    DEFINE_CONSTANT_INTEGER(target, SQLITE_FULL, FULL);
    DEFINE_CONSTANT_INTEGER(target, SQLITE_CANTOPEN, CANTOPEN);
    DEFINE_CONSTANT_INTEGER(target, SQLITE_PROTOCOL, PROTOCOL);
    DEFINE_CONSTANT_INTEGER(target, SQLITE_EMPTY, EMPTY);
    DEFINE_CONSTANT_INTEGER(target, SQLITE_SCHEMA, SCHEMA);
    DEFINE_CONSTANT_INTEGER(target, SQLITE_TOOBIG, TOOBIG);
    DEFINE_CONSTANT_INTEGER(target, SQLITE_CONSTRAINT, CONSTRAINT);
    DEFINE_CONSTANT_INTEGER(target, SQLITE_MISMATCH, MISMATCH);
    DEFINE_CONSTANT_INTEGER(target, SQLITE_MISUSE, MISUSE);
    DEFINE_CONSTANT_INTEGER(target, SQLITE_NOLFS, NOLFS);
    DEFINE_CONSTANT_INTEGER(target, SQLITE_AUTH, AUTH);
    DEFINE_CONSTANT_INTEGER(target, SQLITE_FORMAT, FORMAT);
    DEFINE_CONSTANT_INTEGER(target, SQLITE_RANGE, RANGE);
    DEFINE_CONSTANT_INTEGER(target, SQLITE_NOTADB, NOTADB);
}

}

const char* sqlite_code_string(int code) {
    switch (code) {
        case SQLITE_OK:         return "SQLITE_OK";
        case SQLITE_ERROR:      return "SQLITE_ERROR";
        case SQLITE_INTERNAL:   return "SQLITE_INTERNAL";
        case SQLITE_PERM:       return "SQLITE_PERM";
        case SQLITE_ABORT:      return "SQLITE_ABORT";
        case SQLITE_BUSY:       return "SQLITE_BUSY";
        case SQLITE_LOCKED:     return "SQLITE_LOCKED";
        case SQLITE_NOMEM:      return "SQLITE_NOMEM";
        case SQLITE_READONLY:   return "SQLITE_READONLY";
        case SQLITE_INTERRUPT:  return "SQLITE_INTERRUPT";
        case SQLITE_IOERR:      return "SQLITE_IOERR";
        case SQLITE_CORRUPT:    return "SQLITE_CORRUPT";
        case SQLITE_NOTFOUND:   return "SQLITE_NOTFOUND";
        case SQLITE_FULL:       return "SQLITE_FULL";
        case SQLITE_CANTOPEN:   return "SQLITE_CANTOPEN";
        case SQLITE_PROTOCOL:   return "SQLITE_PROTOCOL";
        case SQLITE_EMPTY:      return "SQLITE_EMPTY";
        case SQLITE_SCHEMA:     return "SQLITE_SCHEMA";
        case SQLITE_TOOBIG:     return "SQLITE_TOOBIG";
        case SQLITE_CONSTRAINT: return "SQLITE_CONSTRAINT";
        case SQLITE_MISMATCH:   return "SQLITE_MISMATCH";
        case SQLITE_MISUSE:     return "SQLITE_MISUSE";
        case SQLITE_NOLFS:      return "SQLITE_NOLFS";
        case SQLITE_AUTH:       return "SQLITE_AUTH";
        case SQLITE_FORMAT:     return "SQLITE_FORMAT";
        case SQLITE_RANGE:      return "SQLITE_RANGE";
        case SQLITE_NOTADB:     return "SQLITE_NOTADB";
        case SQLITE_ROW:        return "SQLITE_ROW";
        case SQLITE_DONE:       return "SQLITE_DONE";
        default:                return "UNKNOWN";
    }
}

const char* sqlite_authorizer_string(int type) {
    switch (type) {
        case SQLITE_INSERT:     return "insert";
        case SQLITE_UPDATE:     return "update";
        case SQLITE_DELETE:     return "delete";
        default:                return "";
    }
}

NODE_MODULE(node_sqlite3, RegisterModule)
