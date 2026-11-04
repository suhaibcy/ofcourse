// Runs JavaScript in a Web Worker, a separate background thread. Network tools are
// removed first, and the worker gets stopped after 2 seconds, so an endless loop
// can't freeze the app.
const TIME_LIMIT_MS = 2000

export type RunResult = { output: string; error?: string }

function workerSource(code: string): string {
  return `
const send = self.postMessage.bind(self);
for (const name of ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'importScripts', 'postMessage']) self[name] = undefined;
const lines = [];
const show = (value) => (typeof value === 'object' ? JSON.stringify(value) : String(value));
const console = { log: (...values) => lines.push(values.map(show).join(' ')) };
try {
  new Function('console', ${JSON.stringify(code)})(console);
  send({ output: lines.join('\\n') });
} catch (error) {
  send({ output: lines.join('\\n'), error: String(error) });
}`
}

export function runCode(code: string): Promise<RunResult> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(new Blob([workerSource(code)], { type: 'text/javascript' }))
    const worker = new Worker(url)
    const finish = (result: RunResult) => {
      clearTimeout(timer)
      worker.terminate()
      URL.revokeObjectURL(url)
      resolve(result)
    }
    const timer = setTimeout(() => finish({ output: '', error: 'This took too long. Is there a loop that never ends?' }), TIME_LIMIT_MS)
    worker.onmessage = (event) => finish(event.data as RunResult)
    worker.onerror = (event) => finish({ output: '', error: event.message })
  })
}
