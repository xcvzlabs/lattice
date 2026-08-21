export type QueryParams = Record<
  string,
  string | number | boolean | (string | number | boolean)[] | undefined
>;

/** Re-serializes an H3 `getQuery()` result into a URL query string (including the leading `?`
 * when non-empty) for forwarding to the gateway's management API. */
export function toQueryString(query: QueryParams): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const entry of value) params.append(key, String(entry));
      continue;
    }
    params.append(key, String(value));
  }

  const search = params.toString();
  return search === '' ? '' : `?${search}`;
}
