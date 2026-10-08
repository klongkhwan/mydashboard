import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'

export async function resolve(specifier, context, nextResolve) {
  let target = specifier
  if (target.startsWith('@/')) {
    target = path.resolve(process.cwd(), target.slice(2))
  }

  // If it is a package import like 'node:fs' or 'next/server'
  if (!target.startsWith('.') && !target.startsWith('/') && !target.includes(':\\')) {
    return nextResolve(specifier, context)
  }

  let absPath = target
  if (absPath.startsWith('file://')) {
    absPath = fileURLToPath(absPath)
  } else if (!path.isAbsolute(absPath) && context.parentURL) {
    absPath = path.resolve(path.dirname(fileURLToPath(context.parentURL)), absPath)
  }

  const extensions = ['', '.ts', '.tsx', '.js', '.mjs', '/index.ts', '/index.js']
  for (const ext of extensions) {
    const candidate = absPath + ext
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return nextResolve(pathToFileURL(candidate).href, context)
    }
  }

  return nextResolve(specifier, context)
}
