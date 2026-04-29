#!/usr/bin/env node
// Serves the built React app from ./dist on a local HTTP port.
// Usage: node server.cjs [port]

const http = require('http')
const fs = require('fs')
const path = require('path')

const PORT = parseInt(process.argv[2] || process.env.PORT || '3000', 10)
const DIST = path.join(__dirname, 'dist')

const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.mjs':  'application/javascript',
  '.css':  'text/css',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
  '.json': 'application/json',
  '.woff2':'font/woff2',
  '.woff': 'font/woff',
  '.ttf':  'font/ttf',
}

const server = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0]
  let filePath = path.join(DIST, urlPath)

  // Prevent directory traversal
  if (!filePath.startsWith(DIST)) {
    res.writeHead(403)
    res.end('Forbidden')
    return
  }

  // Check if file exists; otherwise serve index.html (SPA fallback)
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST, 'index.html')
  }

  const ext = path.extname(filePath)
  const contentType = MIME[ext] || 'application/octet-stream'

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404)
      res.end('Not found')
      return
    }
    res.writeHead(200, { 'Content-Type': contentType })
    res.end(data)
  })
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\nGoodTime Pomodoro running at http://localhost:${PORT}\n`)
  // Try to open browser automatically
  const { exec } = require('child_process')
  const open =
    process.platform === 'win32'  ? `start http://localhost:${PORT}` :
    process.platform === 'darwin' ? `open http://localhost:${PORT}` :
                                    `xdg-open http://localhost:${PORT}`
  exec(open)
})
