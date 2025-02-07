import { spawn } from 'child_process'
import { resolve } from 'path'
import { captureException, init, Integrations } from '@sentry/node'

import { App } from './app'

const { NODE_ENV, TRACES_SAMPLERATE, SENTRY_DSN } = process.env
const port = process.env.PORT ?? 3000

init({
  dsn: SENTRY_DSN,
  enabled: NODE_ENV === 'production',
  tracesSampleRate: Number(TRACES_SAMPLERATE ?? 1),
  integrations: [new Integrations.Http({ tracing: true })],
})

const runUpdateScript = async () => {
  const tsNode = resolve(__dirname, '..', 'node_modules', '.bin', 'ts-node')
  const script = resolve(__dirname, '..', 'bin', 'update.ts')

  const { stdout, stderr } = spawn(tsNode, ['-T', script])

  stdout.on('data', (data) => console.log(data.toString().trim()))
  stderr.on('data', (data) => console.error(data.toString().trim()))
}

const listen = async () => {
  if (NODE_ENV === 'production') {
    await runUpdateScript()

    setInterval(runUpdateScript, 1000 * 60 * 60 * 24)
  }

  App.listen(port, () => {
    console.log(`Listening on ${port}`)
  })

  App.on('error', (err) => {
    console.warn(err)
    captureException(err)
  })
}

listen()
