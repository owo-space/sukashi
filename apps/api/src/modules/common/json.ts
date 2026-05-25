export function toJsonSafe<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, item: unknown) => {
      if (typeof item !== "bigint") return item;
      const asNumber = Number(item);
      return Number.isSafeInteger(asNumber) ? asNumber : item.toString();
    })
  ) as T;
}

export function dataResponse<T>(data: T) {
  return {
    data: toJsonSafe(data),
    code: 200,
    message: ""
  };
}
