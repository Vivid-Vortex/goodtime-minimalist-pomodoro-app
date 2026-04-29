#!/usr/bin/env node
// Creates goodtime-pomodoro-desktop.zip containing dist/ + server.cjs + start scripts.
// Run after `npm run build`: node scripts/package.cjs

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const root = path.join(__dirname, '..')
const outZip = path.join(root, '..', 'goodtime-pomodoro-desktop.zip')

// Use PowerShell on Windows, zip on Unix
if (process.platform === 'win32') {
  const cmd = `powershell -Command "Compress-Archive -Force -Path '${path.join(root, 'dist')}','${path.join(root, 'server.cjs')}' -DestinationPath '${outZip}'"`
  execSync(cmd, { stdio: 'inherit' })
} else {
  execSync(`cd "${root}" && zip -r "${outZip}" dist server.cjs`, { stdio: 'inherit' })
}

console.log(`\nPackage created: ${outZip}`)
console.log('To run: unzip, then: node server.cjs\n')
