import type { ChannelFormatOption } from './formatTypes'

export const CHANNELS = [
  'Tudo',
  'Facebook',
  'Google',
  'Instagram',
  'LinkedIn',
  'Pinterest',
  'TikTok',
  'WhatsApp',
  'X (twitter)',
  'YouTube',
  'Other',
] as const

export type ChannelName = typeof CHANNELS[number]

export const CHANNEL_FORMATS: ChannelFormatOption[] = [
  // --- INSTAGRAM ---
  {
    id: 'ig-post',
    channel: 'Instagram',
    name: 'Post',
    description: 'Postagem padrão para feed do Instagram.',
    mockupType: 'phone',
    defaultProportion: { id: 'ig-portrait', label: 'Retrato', dimension: '1080 × 1350px', ratio: '4:5', icon: 'phone' },
    proportions: [
      { id: 'ig-portrait', label: 'Retrato', dimension: '1080 × 1350px', ratio: '4:5', icon: 'phone' },
      { id: 'ig-square', label: 'Quadrado', dimension: '1080 × 1080px', ratio: '1:1', icon: 'square' },
      { id: 'ig-landscape', label: 'Paisagem', dimension: '1080 × 566px', ratio: '1.91:1', icon: 'banner' },
      { id: 'ig-tall', label: 'Retrato Alto', dimension: '1080 × 1440px', ratio: '3:4', icon: 'phone' },
    ],
  },
  {
    id: 'ig-stories',
    channel: 'Instagram',
    name: 'Stories',
    description: 'Publicação vertical para Stories ou Destaques.',
    mockupType: 'phone',
    defaultProportion: { id: 'ig-stories-std', label: 'Vertical (Stories)', dimension: '1080 × 1920px', ratio: '9:16', icon: 'phone' },
    proportions: [
      { id: 'ig-stories-std', label: 'Vertical (Stories)', dimension: '1080 × 1920px', ratio: '9:16', icon: 'phone' },
    ],
  },
  {
    id: 'ig-post-ad',
    channel: 'Instagram',
    name: 'Post - Anúncio',
    description: 'Peça estática para campanhas pagas de feed no Instagram.',
    mockupType: 'phone',
    defaultProportion: { id: 'ig-ad-portrait', label: 'Retrato', dimension: '1080 × 1350px', ratio: '4:5', icon: 'phone' },
    proportions: [
      { id: 'ig-ad-portrait', label: 'Retrato', dimension: '1080 × 1350px', ratio: '4:5', icon: 'phone' },
      { id: 'ig-ad-square', label: 'Quadrado', dimension: '1080 × 1080px', ratio: '1:1', icon: 'square' },
    ],
  },
  {
    id: 'ig-stories-ad',
    channel: 'Instagram',
    name: 'Stories - Anúncio',
    description: 'Anúncio em tela cheia para Stories com foco em conversão.',
    mockupType: 'phone',
    defaultProportion: { id: 'ig-stories-ad-std', label: 'Vertical (9:16)', dimension: '1080 × 1920px', ratio: '9:16', icon: 'phone' },
    proportions: [
      { id: 'ig-stories-ad-std', label: 'Vertical (9:16)', dimension: '1080 × 1920px', ratio: '9:16', icon: 'phone' },
    ],
  },
  {
    id: 'ig-meta-variados',
    channel: 'Instagram',
    name: 'Meta (Facebook / Instagram) - Variados',
    description: 'Formatos adaptáveis para veiculação cruzada Meta.',
    mockupType: 'grid',
    defaultProportion: { id: 'meta-square', label: 'Quadrado', dimension: '1080 × 1080px', ratio: '1:1', icon: 'square' },
    proportions: [
      { id: 'meta-square', label: 'Quadrado', dimension: '1080 × 1080px', ratio: '1:1', icon: 'square' },
      { id: 'meta-portrait', label: 'Retrato', dimension: '1080 × 1350px', ratio: '4:5', icon: 'phone' },
      { id: 'meta-stories', label: 'Stories', dimension: '1080 × 1920px', ratio: '9:16', icon: 'phone' },
    ],
  },
  {
    id: 'ig-avatar',
    channel: 'Instagram',
    name: 'Foto de perfil',
    description: 'Imagem circular para identificação do perfil.',
    mockupType: 'square',
    defaultProportion: { id: 'ig-profile-std', label: 'Quadrado', dimension: '320 × 320px', ratio: '1:1', icon: 'square' },
    proportions: [
      { id: 'ig-profile-std', label: 'Quadrado', dimension: '320 × 320px', ratio: '1:1', icon: 'square' },
    ],
  },

  // --- FACEBOOK ---
  {
    id: 'fb-meta-variados',
    channel: 'Facebook',
    name: 'Meta (Facebook / Instagram) - Variados',
    description: 'Formatos combinados para Facebook e Instagram.',
    mockupType: 'grid',
    defaultProportion: { id: 'fb-meta-square', label: 'Quadrado', dimension: '1080 × 1080px', ratio: '1:1', icon: 'square' },
    proportions: [
      { id: 'fb-meta-square', label: 'Quadrado', dimension: '1080 × 1080px', ratio: '1:1', icon: 'square' },
      { id: 'fb-meta-portrait', label: 'Retrato', dimension: '1080 × 1350px', ratio: '4:5', icon: 'phone' },
      { id: 'fb-meta-landscape', label: 'Paisagem', dimension: '1200 × 630px', ratio: '1.91:1', icon: 'banner' },
    ],
  },
  {
    id: 'fb-post',
    channel: 'Facebook',
    name: 'Post',
    description: 'Post para feed de página ou perfil no Facebook.',
    mockupType: 'phone',
    defaultProportion: { id: 'fb-post-square', label: 'Quadrado', dimension: '1080 × 1080px', ratio: '1:1', icon: 'square' },
    proportions: [
      { id: 'fb-post-square', label: 'Quadrado', dimension: '1080 × 1080px', ratio: '1:1', icon: 'square' },
      { id: 'fb-post-landscape', label: 'Paisagem', dimension: '1200 × 630px', ratio: '1.91:1', icon: 'banner' },
      { id: 'fb-post-portrait', label: 'Retrato', dimension: '1080 × 1350px', ratio: '4:5', icon: 'phone' },
    ],
  },
  {
    id: 'fb-stories',
    channel: 'Facebook',
    name: 'Stories',
    description: 'Stories verticais para páginas e perfis.',
    mockupType: 'phone',
    defaultProportion: { id: 'fb-stories-std', label: 'Vertical', dimension: '1080 × 1920px', ratio: '9:16', icon: 'phone' },
    proportions: [
      { id: 'fb-stories-std', label: 'Vertical', dimension: '1080 × 1920px', ratio: '9:16', icon: 'phone' },
    ],
  },
  {
    id: 'fb-group-cover',
    channel: 'Facebook',
    name: 'Capa de grupo',
    description: 'Banner de cabeçalho para grupos do Facebook.',
    mockupType: 'cover',
    defaultProportion: { id: 'fb-cover-group-std', label: 'Paisagem', dimension: '1640 × 856px', ratio: '1.91:1', icon: 'banner' },
    proportions: [
      { id: 'fb-cover-group-std', label: 'Paisagem', dimension: '1640 × 856px', ratio: '1.91:1', icon: 'banner' },
    ],
  },
  {
    id: 'fb-event-cover',
    channel: 'Facebook',
    name: 'Capa de evento',
    description: 'Banner de destaque para eventos do Facebook.',
    mockupType: 'cover',
    defaultProportion: { id: 'fb-cover-event-std', label: 'Paisagem', dimension: '1920 × 1005px', ratio: '1.91:1', icon: 'banner' },
    proportions: [
      { id: 'fb-cover-event-std', label: 'Paisagem', dimension: '1920 × 1005px', ratio: '1.91:1', icon: 'banner' },
    ],
  },
  {
    id: 'fb-page-cover',
    channel: 'Facebook',
    name: 'Capa de página',
    description: 'Imagem de capa no topo de fanpages institucionais.',
    mockupType: 'cover',
    defaultProportion: { id: 'fb-cover-page-std', label: 'Paisagem', dimension: '820 × 312px', ratio: '2.6:1', icon: 'banner' },
    proportions: [
      { id: 'fb-cover-page-std', label: 'Paisagem', dimension: '820 × 312px', ratio: '2.6:1', icon: 'banner' },
    ],
  },
  {
    id: 'fb-avatar',
    channel: 'Facebook',
    name: 'Foto de perfil',
    description: 'Foto redonda de perfil para página ou usuário.',
    mockupType: 'square',
    defaultProportion: { id: 'fb-profile-std', label: 'Quadrado', dimension: '180 × 180px', ratio: '1:1', icon: 'square' },
    proportions: [
      { id: 'fb-profile-std', label: 'Quadrado', dimension: '180 × 180px', ratio: '1:1', icon: 'square' },
    ],
  },

  // --- GOOGLE ---
  {
    id: 'google-mobile',
    channel: 'Google',
    name: 'Mobile',
    description: 'Banners para exibição em dispositivos móveis na rede Google.',
    mockupType: 'phone',
    defaultProportion: { id: 'g-m-rect', label: 'Retângulo Médio', dimension: '300 × 250px', ratio: '1.2:1', icon: 'phone' },
    proportions: [
      { id: 'g-m-rect', label: 'Retângulo Médio', dimension: '300 × 250px', ratio: '1.2:1', icon: 'phone' },
      { id: 'g-m-banner-lg', label: 'Banner Grande Celular', dimension: '320 × 100px', ratio: '3.2:1', icon: 'banner' },
      { id: 'g-m-banner', label: 'Banner Celular', dimension: '320 × 50px', ratio: '6.4:1', icon: 'banner' },
    ],
  },
  {
    id: 'google-desktop',
    channel: 'Google',
    name: 'Desktop',
    description: 'Banners display de alto impacto para telas de computadores.',
    mockupType: 'desktop',
    defaultProportion: { id: 'g-d-leader', label: 'Leaderboard', dimension: '728 × 90px', ratio: '8:1', icon: 'desktop' },
    proportions: [
      { id: 'g-d-leader', label: 'Leaderboard', dimension: '728 × 90px', ratio: '8:1', icon: 'desktop' },
      { id: 'g-d-halfpage', label: 'Half-Page / Arranha-céu', dimension: '300 × 600px', ratio: '1:2', icon: 'phone' },
      { id: 'g-d-billboard', label: 'Billboard', dimension: '970 × 250px', ratio: '3.88:1', icon: 'desktop' },
      { id: 'g-d-large-leader', label: 'Leaderboard Grande', dimension: '970 × 90px', ratio: '10.7:1', icon: 'desktop' },
    ],
  },
  {
    id: 'google-variados',
    channel: 'Google',
    name: 'Google / Bing - Variados',
    description: 'Campanhas Performance Max e Discovery para buscadores.',
    mockupType: 'grid',
    defaultProportion: { id: 'g-pmax-landscape', label: 'Paisagem (PMax)', dimension: '1200 × 628px', ratio: '1.91:1', icon: 'banner' },
    proportions: [
      { id: 'g-pmax-landscape', label: 'Paisagem (PMax)', dimension: '1200 × 628px', ratio: '1.91:1', icon: 'banner' },
      { id: 'g-pmax-square', label: 'Quadrado (PMax)', dimension: '1200 × 1200px', ratio: '1:1', icon: 'square' },
      { id: 'g-pmax-portrait', label: 'Retrato (Discovery)', dimension: '960 × 1200px', ratio: '4:5', icon: 'phone' },
    ],
  },

  // --- LINKEDIN ---
  {
    id: 'li-post',
    channel: 'LinkedIn',
    name: 'Post',
    description: 'Postagem institucional e B2B para o feed do LinkedIn.',
    mockupType: 'phone',
    defaultProportion: { id: 'li-post-sq', label: 'Quadrado', dimension: '1200 × 1200px', ratio: '1:1', icon: 'square' },
    proportions: [
      { id: 'li-post-sq', label: 'Quadrado', dimension: '1200 × 1200px', ratio: '1:1', icon: 'square' },
      { id: 'li-post-port', label: 'Retrato', dimension: '1080 × 1350px', ratio: '4:5', icon: 'phone' },
      { id: 'li-post-land', label: 'Paisagem', dimension: '1200 × 627px', ratio: '1.91:1', icon: 'banner' },
    ],
  },
  {
    id: 'li-article-cover',
    channel: 'LinkedIn',
    name: 'Capa de artigo',
    description: 'Cabeçalho gráfico para artigos longos e newsletters LinkedIn.',
    mockupType: 'cover',
    defaultProportion: { id: 'li-art-cover-std', label: 'Paisagem', dimension: '1920 × 1080px', ratio: '16:9', icon: 'banner' },
    proportions: [
      { id: 'li-art-cover-std', label: 'Paisagem', dimension: '1920 × 1080px', ratio: '16:9', icon: 'banner' },
    ],
  },
  {
    id: 'li-profile-cover',
    channel: 'LinkedIn',
    name: 'Capa de perfil',
    description: 'Banner de fundo do perfil corporativo ou pessoal.',
    mockupType: 'cover',
    defaultProportion: { id: 'li-prof-cover-std', label: 'Paisagem', dimension: '1584 × 396px', ratio: '4:1', icon: 'banner' },
    proportions: [
      { id: 'li-prof-cover-std', label: 'Paisagem', dimension: '1584 × 396px', ratio: '4:1', icon: 'banner' },
    ],
  },
  {
    id: 'li-avatar',
    channel: 'LinkedIn',
    name: 'Foto de perfil',
    description: 'Foto profissional redonda para perfis ou Company Pages.',
    mockupType: 'square',
    defaultProportion: { id: 'li-avatar-std', label: 'Quadrado', dimension: '400 × 400px', ratio: '1:1', icon: 'square' },
    proportions: [
      { id: 'li-avatar-std', label: 'Quadrado', dimension: '400 × 400px', ratio: '1:1', icon: 'square' },
    ],
  },

  // --- WHATSAPP ---
  {
    id: 'wa-status',
    channel: 'WhatsApp',
    name: 'Status',
    description: 'Conteúdo vertical para visualização temporária no WhatsApp.',
    mockupType: 'phone',
    defaultProportion: { id: 'wa-status-std', label: 'Retrato (Vertical)', dimension: '1080 × 1920px', ratio: '9:16', icon: 'phone' },
    proportions: [
      { id: 'wa-status-std', label: 'Retrato (Vertical)', dimension: '1080 × 1920px', ratio: '9:16', icon: 'phone' },
    ],
  },
  {
    id: 'wa-biz-cover',
    channel: 'WhatsApp',
    name: 'Capa - WhatsApp Business',
    description: 'Banner de cabeçalho do perfil comercial do WhatsApp.',
    mockupType: 'cover',
    defaultProportion: { id: 'wa-biz-cover-std', label: 'Paisagem', dimension: '1920 × 1080px', ratio: '16:9', icon: 'banner' },
    proportions: [
      { id: 'wa-biz-cover-std', label: 'Paisagem', dimension: '1920 × 1080px', ratio: '16:9', icon: 'banner' },
    ],
  },
  {
    id: 'wa-avatar',
    channel: 'WhatsApp',
    name: 'Foto de perfil',
    description: 'Avatar para identificação de atendimento no WhatsApp.',
    mockupType: 'square',
    defaultProportion: { id: 'wa-avatar-std', label: 'Quadrado', dimension: '500 × 500px', ratio: '1:1', icon: 'square' },
    proportions: [
      { id: 'wa-avatar-std', label: 'Quadrado', dimension: '500 × 500px', ratio: '1:1', icon: 'square' },
    ],
  },
  {
    id: 'wa-sticker',
    channel: 'WhatsApp',
    name: 'Sticker',
    description: 'Figurinha personalizada para engajamento em conversas.',
    mockupType: 'square',
    defaultProportion: { id: 'wa-sticker-std', label: 'Quadrado', dimension: '512 × 512px', ratio: '1:1', icon: 'square' },
    proportions: [
      { id: 'wa-sticker-std', label: 'Quadrado', dimension: '512 × 512px', ratio: '1:1', icon: 'square' },
    ],
  },

  // --- YOUTUBE ---
  {
    id: 'yt-thumbnail',
    channel: 'YouTube',
    name: 'Thumbnail',
    description: 'Miniatura de alto clique para vídeos no YouTube.',
    mockupType: 'cover',
    defaultProportion: { id: 'yt-thumb-std', label: 'Paisagem (16:9)', dimension: '1280 × 720px', ratio: '16:9', icon: 'banner' },
    proportions: [
      { id: 'yt-thumb-std', label: 'Paisagem (16:9)', dimension: '1280 × 720px', ratio: '16:9', icon: 'banner' },
    ],
  },
  {
    id: 'yt-channel-banner',
    channel: 'YouTube',
    name: 'Banner de canal',
    description: 'Arte principal do cabeçalho da página do canal.',
    mockupType: 'cover',
    defaultProportion: { id: 'yt-banner-std', label: 'Paisagem', dimension: '2560 × 1440px', ratio: '16:9', icon: 'banner' },
    proportions: [
      { id: 'yt-banner-std', label: 'Paisagem', dimension: '2560 × 1440px', ratio: '16:9', icon: 'banner' },
    ],
  },
  {
    id: 'yt-ads',
    channel: 'YouTube',
    name: 'YouTube Ads',
    description: 'Banners complementares de campanhas de vídeo no YouTube.',
    mockupType: 'desktop',
    defaultProportion: { id: 'yt-ads-std', label: 'Paisagem', dimension: '1920 × 1080px', ratio: '16:9', icon: 'desktop' },
    proportions: [
      { id: 'yt-ads-std', label: 'Paisagem', dimension: '1920 × 1080px', ratio: '16:9', icon: 'desktop' },
    ],
  },

  // --- TIKTOK ---
  {
    id: 'tt-ads',
    channel: 'TikTok',
    name: 'TikTok Ads',
    description: 'Anúncio estático vertical para o feed do TikTok.',
    mockupType: 'phone',
    defaultProportion: { id: 'tt-ads-std', label: 'Retrato (Vertical)', dimension: '1080 × 1920px', ratio: '9:16', icon: 'phone' },
    proportions: [
      { id: 'tt-ads-std', label: 'Retrato (Vertical)', dimension: '1080 × 1920px', ratio: '9:16', icon: 'phone' },
    ],
  },
  {
    id: 'tt-post',
    channel: 'TikTok',
    name: 'Post',
    description: 'Material vertical adaptado para carrossel ou capa no TikTok.',
    mockupType: 'phone',
    defaultProportion: { id: 'tt-post-std', label: 'Retrato (Vertical)', dimension: '1080 × 1920px', ratio: '9:16', icon: 'phone' },
    proportions: [
      { id: 'tt-post-std', label: 'Retrato (Vertical)', dimension: '1080 × 1920px', ratio: '9:16', icon: 'phone' },
    ],
  },

  // --- PINTEREST ---
  {
    id: 'pt-pins',
    channel: 'Pinterest',
    name: 'Pins',
    description: 'Pin vertical padrão para alto engajamento visual.',
    mockupType: 'phone',
    defaultProportion: { id: 'pt-pin-std', label: 'Retrato (2:3)', dimension: '1000 × 1500px', ratio: '2:3', icon: 'phone' },
    proportions: [
      { id: 'pt-pin-std', label: 'Retrato (2:3)', dimension: '1000 × 1500px', ratio: '2:3', icon: 'phone' },
      { id: 'pt-pin-long', label: 'Pin Longo', dimension: '1000 × 2100px', ratio: '1:2.1', icon: 'phone' },
    ],
  },
  {
    id: 'pt-idea-pin',
    channel: 'Pinterest',
    name: 'Idea Pin/Story',
    description: 'Formato dinâmico de tela cheia vertical.',
    mockupType: 'phone',
    defaultProportion: { id: 'pt-idea-std', label: 'Vertical (9:16)', dimension: '1080 × 1920px', ratio: '9:16', icon: 'phone' },
    proportions: [
      { id: 'pt-idea-std', label: 'Vertical (9:16)', dimension: '1080 × 1920px', ratio: '9:16', icon: 'phone' },
    ],
  },
  {
    id: 'pt-board-cover',
    channel: 'Pinterest',
    name: 'Capa de board',
    description: 'Capa quadrada para organização das pastas do perfil.',
    mockupType: 'square',
    defaultProportion: { id: 'pt-board-std', label: 'Quadrado', dimension: '600 × 600px', ratio: '1:1', icon: 'square' },
    proportions: [
      { id: 'pt-board-std', label: 'Quadrado', dimension: '600 × 600px', ratio: '1:1', icon: 'square' },
    ],
  },

  // --- X (TWITTER) ---
  {
    id: 'x-post',
    channel: 'X (twitter)',
    name: 'Post',
    description: 'Imagem estática otimizada para o feed do X.',
    mockupType: 'phone',
    defaultProportion: { id: 'x-post-land', label: 'Paisagem (16:9)', dimension: '1200 × 675px', ratio: '16:9', icon: 'banner' },
    proportions: [
      { id: 'x-post-land', label: 'Paisagem (16:9)', dimension: '1200 × 675px', ratio: '16:9', icon: 'banner' },
      { id: 'x-post-sq', label: 'Quadrado', dimension: '1080 × 1080px', ratio: '1:1', icon: 'square' },
    ],
  },
  {
    id: 'x-header',
    channel: 'X (twitter)',
    name: 'Foto de capa',
    description: 'Banner de cabeçalho do perfil no X.',
    mockupType: 'cover',
    defaultProportion: { id: 'x-cover-std', label: 'Paisagem (3:1)', dimension: '1500 × 500px', ratio: '3:1', icon: 'banner' },
    proportions: [
      { id: 'x-cover-std', label: 'Paisagem (3:1)', dimension: '1500 × 500px', ratio: '3:1', icon: 'banner' },
    ],
  },
  {
    id: 'x-avatar',
    channel: 'X (twitter)',
    name: 'Foto de perfil',
    description: 'Avatar para identificação do perfil.',
    mockupType: 'square',
    defaultProportion: { id: 'x-avatar-std', label: 'Quadrado', dimension: '400 × 400px', ratio: '1:1', icon: 'square' },
    proportions: [
      { id: 'x-avatar-std', label: 'Quadrado', dimension: '400 × 400px', ratio: '1:1', icon: 'square' },
    ],
  },

  // --- OTHER ---
  {
    id: 'other-amazon',
    channel: 'Other',
    name: 'Amazon Ads',
    description: 'Peça estática para publicidade no ecossistema Amazon.',
    mockupType: 'grid',
    defaultProportion: { id: 'oth-amz-rect', label: 'Retângulo', dimension: '300 × 250px', icon: 'square' },
    proportions: [
      { id: 'oth-amz-rect', label: 'Retângulo', dimension: '300 × 250px', icon: 'square' },
      { id: 'oth-amz-billboard', label: 'Banner Grande', dimension: '970 × 250px', icon: 'banner' },
    ],
  },
  {
    id: 'other-ml',
    channel: 'Other',
    name: 'Mercado Livre Ads',
    description: 'Banner comercial para campanhas no Mercado Livre.',
    mockupType: 'grid',
    defaultProportion: { id: 'oth-ml-sq', label: 'Quadrado', dimension: '1200 × 1200px', icon: 'square' },
    proportions: [
      { id: 'oth-ml-sq', label: 'Quadrado', dimension: '1200 × 1200px', icon: 'square' },
      { id: 'oth-ml-rect', label: 'Paisagem', dimension: '1200 × 628px', icon: 'banner' },
    ],
  },
  {
    id: 'other-spotify',
    channel: 'Other',
    name: 'Display - Spotify',
    description: 'Arte visual de apoio para anúncios no aplicativo Spotify.',
    mockupType: 'grid',
    defaultProportion: { id: 'oth-spot-std', label: 'Quadrado', dimension: '640 × 640px', icon: 'square' },
    proportions: [
      { id: 'oth-spot-std', label: 'Quadrado', dimension: '640 × 640px', icon: 'square' },
      { id: 'oth-spot-rect', label: 'Retângulo', dimension: '300 × 250px', icon: 'phone' },
    ],
  },
  {
    id: 'other-criteo',
    channel: 'Other',
    name: 'Criteo',
    description: 'Banners de retargeting para redes de programática Criteo.',
    mockupType: 'grid',
    defaultProportion: { id: 'oth-criteo-std', label: 'Retângulo', dimension: '300 × 250px', icon: 'phone' },
    proportions: [
      { id: 'oth-criteo-std', label: 'Retângulo', dimension: '300 × 250px', icon: 'phone' },
      { id: 'oth-criteo-lead', label: 'Leaderboard', dimension: '728 × 90px', icon: 'banner' },
    ],
  },
  {
    id: 'other-taboola',
    channel: 'Other',
    name: 'Taboola',
    description: 'Imagens para publicidade nativa e links patrocinados.',
    mockupType: 'grid',
    defaultProportion: { id: 'oth-taboola-std', label: 'Paisagem', dimension: '1000 × 600px', icon: 'banner' },
    proportions: [
      { id: 'oth-taboola-std', label: 'Paisagem', dimension: '1000 × 600px', icon: 'banner' },
    ],
  },
  {
    id: 'other-uber',
    channel: 'Other',
    name: 'Uber Ads',
    description: 'Formatos para publicidade no aplicativo Uber.',
    mockupType: 'phone',
    defaultProportion: { id: 'oth-uber-std', label: 'Retângulo', dimension: '1200 × 628px', icon: 'banner' },
    proportions: [
      { id: 'oth-uber-std', label: 'Retângulo', dimension: '1200 × 628px', icon: 'banner' },
    ],
  },
]

export const STANDARD_ADDONS = [
  {
    code: 'criacao-de-conteudo-publicitario',
    name: 'Quero que crie um texto para mim',
    credits: 1,
    description: 'Redação profissional para o título, chamada e corpo da peça.',
  },
  {
    code: 'legenda-para-redes-sociais',
    name: 'Adicionar legenda ao post',
    credits: 1,
    description: 'Copy completa com hashtags e chamada para ação para a legenda.',
  },
  {
    code: 'animacao-de-imagem-estatica-via-ia',
    name: 'Quero usar IA para animar a minha imagem',
    credits: 0.7,
    description: 'Animação fluida e efeitos visuais em movimento potencializados por IA.',
  },
  {
    code: 'geracao-de-imagem-via-ia',
    name: 'Quero gerar uma imagem com IA',
    credits: 0.7,
    description: 'Criação de imagem exclusiva com inteligência artificial para o anúncio.',
  },
]
