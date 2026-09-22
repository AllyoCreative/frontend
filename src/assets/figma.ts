import manifest from './figma-manifest.json'

type FigmaAssetKey = keyof typeof manifest

export function figmaAsset(key: FigmaAssetKey) {
  const url = manifest[key]
  const extension = new URL(url).pathname.split('.').pop() ?? 'bin'
  return `/assets/figma/${key.replace(/[^a-zA-Z0-9_-]/g, '_')}.${extension}`
}
