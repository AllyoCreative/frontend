import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { extname, resolve } from 'node:path'

const projectRoot = resolve(import.meta.dirname, '..')
const manifest = JSON.parse(await readFile(resolve(projectRoot, 'src/assets/figma-manifest.json'), 'utf8'))
const outputDir = resolve(projectRoot, 'public/assets/figma')

await mkdir(outputDir, { recursive: true })

const entries = Object.entries(manifest)
let cursor = 0

function filename(key, url) {
  const extension = extname(new URL(url).pathname) || '.bin'
  return `${key.replace(/[^a-zA-Z0-9_-]/g, '_')}${extension}`
}

async function worker() {
  while (cursor < entries.length) {
    const [key, url] = entries[cursor++]
    const response = await fetch(url)
    if (!response.ok) throw new Error(`${response.status} while downloading ${key}`)
    await writeFile(resolve(outputDir, filename(key, url)), Buffer.from(await response.arrayBuffer()))
  }
}

await Promise.all(Array.from({ length: 10 }, worker))
console.log(`Downloaded ${entries.length} Figma assets.`)
