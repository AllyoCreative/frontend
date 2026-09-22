import { figmaAsset } from '../assets/figma'

export function Logo({ compact = false, light = false }: { compact?: boolean; light?: boolean }) {
  return (
    <img
      className={`logo ${compact ? 'logo--compact' : ''}`}
      src={figmaAsset(light ? 'login.imgGroup1410119445' : 'home.imgGroup1410119445')}
      alt="Allyo"
    />
  )
}
