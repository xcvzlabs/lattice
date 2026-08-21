const DATA_PREFIX = 'data: ';
const DONE_SENTINEL = '[DONE]';

/** Parses a `data: {json}` SSE stream (OpenAI- and Gemini-shaped) into JS values, stopping at `[DONE]`. */
export async function* parseDataOnlySseStream(
  response: Response,
): AsyncGenerator<unknown, void, void> {
  const body = response.body;
  if (body === null) return;

  const reader = body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';

  try {
    while (true) {
      // Each read depends on the previous one draining the stream, so there is nothing here to
      // batch into a Promise.all.
      // oxlint-disable-next-line no-await-in-loop
      const { done, value } = await reader.read();
      if (done) break;
      buffer += value;

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith(DATA_PREFIX)) continue;
        const data = line.slice(DATA_PREFIX.length).trim();
        if (data === DONE_SENTINEL) return;
        yield JSON.parse(data);
      }
    }
  } finally {
    reader.releaseLock();
  }
}

const EVENT_PREFIX = 'event: ';

export type NamedSseEvent = {
  event: string;
  data: unknown;
};

/** Parses an `event: name` / `data: {json}` SSE stream (Anthropic-shaped), one JSON payload per event block. */
export async function* parseNamedEventSseStream(
  response: Response,
): AsyncGenerator<NamedSseEvent, void, void> {
  const body = response.body;
  if (body === null) return;

  const reader = body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';

  try {
    while (true) {
      // Same reasoning as the data-only parser above: each read depends on the last.
      // oxlint-disable-next-line no-await-in-loop
      const { done, value } = await reader.read();
      if (done) break;
      buffer += value;

      const eventBlocks = buffer.split('\n\n');
      buffer = eventBlocks.pop() ?? '';

      for (const block of eventBlocks) {
        let eventName = 'message';
        let data = '';

        for (const line of block.split('\n')) {
          if (line.startsWith(EVENT_PREFIX)) eventName = line.slice(EVENT_PREFIX.length).trim();
          if (line.startsWith(DATA_PREFIX)) data = line.slice(DATA_PREFIX.length).trim();
        }

        if (data === '') continue;
        yield { event: eventName, data: JSON.parse(data) };
      }
    }
  } finally {
    reader.releaseLock();
  }
}
