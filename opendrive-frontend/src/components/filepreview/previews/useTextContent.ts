import { useEffect, useState } from 'react';

interface TextState {
    loading: boolean;
    error: string | null;
    text: string;
    truncated: boolean;
}

const INITIAL: TextState = { loading: true, error: null, text: '', truncated: false };

export const MAX_TEXT_BYTES = 2 * 1024 * 1024;

function decode(bytes: Uint8Array, truncated: boolean): string {
    let label = 'utf-8';
    if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) label = 'utf-16le';
    else if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) label = 'utf-16be';

    if (label === 'utf-8') {
        // NUL bytes in the first 8 KB mean this is not a text file
        const probe = bytes.subarray(0, 8000);
        if (probe.includes(0)) throw new Error('This looks like a binary file, not text.');
    }

    const text = new TextDecoder(label).decode(bytes);
    // A cut-off multi-byte character at the truncation point decodes to U+FFFD
    return truncated ? text.replace(/\uFFFD$/, '') : text;
}

export function useTextContent(src: string, maxBytes = MAX_TEXT_BYTES): TextState {
    const [state, setState] = useState<TextState>(INITIAL);

    useEffect(() => {
        const controller = new AbortController();

        async function load() {
            try {
                setState(INITIAL);

                const response = await fetch(src, { signal: controller.signal });
                if (!response.ok) {
                    throw new Error(`Unable to load file: ${response.status}`);
                }

                const chunks: Uint8Array[] = [];
                let received = 0;
                let truncated = false;

                const reader = response.body?.getReader();
                if (reader) {
                    for (;;) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        chunks.push(value);
                        received += value.length;
                        if (received > maxBytes) {
                            truncated = true;
                            await reader.cancel();
                            break;
                        }
                    }
                } else {
                    const buf = new Uint8Array(await response.arrayBuffer());
                    chunks.push(buf);
                    received = buf.length;
                    truncated = received > maxBytes;
                }

                const merged = new Uint8Array(received);
                let offset = 0;
                for (const chunk of chunks) {
                    merged.set(chunk, offset);
                    offset += chunk.length;
                }

                const text = decode(truncated ? merged.subarray(0, maxBytes) : merged, truncated);

                if (!controller.signal.aborted) {
                    setState({ loading: false, error: null, text, truncated });
                }
            } catch (err) {
                if (controller.signal.aborted) return;
                setState({
                    loading: false,
                    error: err instanceof Error ? err.message : 'Unable to read file.',
                    text: '',
                    truncated: false,
                });
            }
        }

        void load();
        return () => controller.abort();
    }, [src, maxBytes]);

    return state;
}