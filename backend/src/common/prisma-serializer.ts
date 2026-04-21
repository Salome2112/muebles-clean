import { Decimal } from '@prisma/client/runtime/library';

export function serializeDecimal<T>(value: T): T {
  if (value instanceof Decimal) {
    return Number(value.toString()) as T;
  }

  if (value instanceof Date) {
    return value.toISOString() as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => serializeDecimal(item)) as T;
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [
        key,
        serializeDecimal(entryValue),
      ]),
    ) as T;
  }

  return value;
}
