"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializeDecimal = serializeDecimal;
const library_1 = require("@prisma/client/runtime/library");
function serializeDecimal(value) {
    if (value instanceof library_1.Decimal) {
        return Number(value.toString());
    }
    if (value instanceof Date) {
        return value.toISOString();
    }
    if (Array.isArray(value)) {
        return value.map((item) => serializeDecimal(item));
    }
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([key, entryValue]) => [
            key,
            serializeDecimal(entryValue),
        ]));
    }
    return value;
}
//# sourceMappingURL=prisma-serializer.js.map