const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')

// Load the project's TS modules in Node, with explicit substitutes for services
// such as Supabase so regression tests never contact a real database.
module.exports = function loadTypeScript(file, dependencies = {}, cache = new Map()) {
  const filename = path.resolve(file)
  if (cache.has(filename)) return cache.get(filename).exports
  const module = new Module(filename, undefined)
  module.filename = filename
  module.paths = Module._nodeModulePaths(path.dirname(filename))
  cache.set(filename, module)
  const originalRequire = module.require.bind(module)
  module.require = (specifier) => {
    if (Object.hasOwn(dependencies, specifier)) return dependencies[specifier]
    const target = specifier.startsWith('@/')
      ? path.resolve(specifier.slice(2))
      : specifier.startsWith('.') ? path.resolve(path.dirname(filename), specifier) : null
    if (target) {
      const source = [target, `${target}.ts`, `${target}.tsx`].find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile())
      if (source && /\.tsx?$/.test(source)) return loadTypeScript(source, dependencies, cache)
    }
    return originalRequire(specifier)
  }
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
    fileName: filename,
  })
  module._compile(outputText, filename)
  return module.exports
}
