export function buildInstance(key: SplitIO.SplitKey): string {
  // @ts-ignore
  if (!key.bucketingKey) return key;
  // @ts-ignore
  return `${key.matchingKey ? key.matchingKey : key}-${key.bucketingKey ? key.bucketingKey : key}-`;
}

export function parseTreatmentParams(param1: string | string[] | SplitIO.SplitKey, param2?: string | string[] | SplitIO.Attributes | undefined, param3?: SplitIO.Attributes | undefined): any {
  if (isString(param2) || Array.isArray(param2)) return { key: param1, splitNames: param2, attributes: param3};
  return { key: undefined, splitNames: param1, attributes: param2 };
}

export function parseTrackParams(param1: string | SplitIO.SplitKey, param2: string, param3: number | string | undefined, param4: number | SplitIO.Properties | undefined, param5: SplitIO.Properties | undefined) {
  if (isString(param3)) return { key: param1, trafficType: param2, eventType: param3, value: param4, properties: param5};
  return { key: undefined, trafficType: param1, eventType: param2, value: param3, properties: param4 };
}

export function isString(val: any): val is string {
  return typeof val === 'string' || val instanceof String;
}
