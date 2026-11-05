// Runs JavaScript well away from the app. There are three walls:
// 1. A sandboxed iframe with no origin of its own, so it can't reach this app's saved data.
// 2. A security policy that blocks all network access, for the code and anything it starts.
// 3. A Web Worker inside it, so an endless loop can't freeze the page. Removing the
//    iframe after 2 seconds stops everything in it.
const TIME_LIMIT_MS = 2000
const MAX_OUTPUT = 10_000

export type RunResult = { output: string; error?: string }

const WORKER = `
const send = self.postMessage.bind(self);
const lines = [];
const show = (value) => (typeof value === 'object' ? JSON.stringify(value) : String(value));
const console = { log: (...values) => lines.push(values.map(show).join(' ')) };
self.onmessage = (event) => {
  try {
    new Function('console', event.data)(console);
    send({ output: lines.join('\\n') });
  } catch (error) {
    send({ output: lines.join('\\n'), error: String(error) });
  }
};`

const PAGE = `<!doctype html>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' blob:; worker-src blob:">
<script>
window.addEventListener('message', (event) => {
  const reply = (result) => parent.postMessage(result, '*');
  try {
    const worker = new Worker(URL.createObjectURL(new Blob([${JSON.stringify(WORKER)}], { type: 'text/javascript' })));
    worker.onmessage = (message) => reply(message.data);
    worker.onerror = (problem) => reply({ output: '', error: problem.message });
    worker.postMessage(event.data);
  } catch (error) {
    reply({ output: '', error: String(error) });
  }
}, { once: true });
parent.postMessage('ready', '*');
</script>`

export function runCode(code: string): Promise<RunResult> {
  return new Promise((resolve) => {
    const frame = document.createElement('iframe')
    frame.setAttribute('sandbox', 'allow-scripts') // no allow-same-origin: that's what keeps it apart
    frame.hidden = true
    frame.srcdoc = PAGE

    const finish = (result: RunResult) => {
      clearTimeout(timer)
      window.removeEventListener('message', onMessage)
      frame.remove()
      resolve(result)
    }
    const timer = setTimeout(() => finish({ output: '', error: 'This took too long. Is there a loop that never ends?' }), TIME_LIMIT_MS)

    function onMessage(event: MessageEvent) {
      if (event.source !== frame.contentWindow) return // only this iframe can answer
      if (event.data === 'ready') {
        frame.contentWindow?.postMessage(code, '*')
        return
      }
      const data = event.data as Partial<RunResult>
      finish({ output: String(data?.output ?? '').slice(0, MAX_OUTPUT), ...(data?.error ? { error: String(data.error).slice(0, MAX_OUTPUT) } : {}) })
    }
    window.addEventListener('message', onMessage)
    document.body.appendChild(frame)
  })
}
