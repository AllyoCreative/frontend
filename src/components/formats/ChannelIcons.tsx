import React from 'react'

export function ChannelBadgeIcon({ channel, size = 18 }: { channel: string; size?: number }) {
  const norm = channel.toLowerCase()

  if (norm.includes('instagram')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="24" height="24" rx="6" fill="url(#ig-grad)" />
        <rect x="4.5" y="4.5" width="15" height="15" rx="4" stroke="#ffffff" strokeWidth="1.8" fill="none" />
        <circle cx="12" cy="12" r="3.6" stroke="#ffffff" strokeWidth="1.8" fill="none" />
        <circle cx="16.5" cy="7.5" r="1.1" fill="#ffffff" />
        <defs>
          <linearGradient id="ig-grad" x1="2" y1="22" x2="22" y2="2" gradientUnits="userSpaceOnUse">
            <stop stopColor="#f58529" />
            <stop offset="0.5" stopColor="#dd2a7b" />
            <stop offset="1" stopColor="#8134af" />
          </linearGradient>
        </defs>
      </svg>
    )
  }

  if (norm.includes('facebook')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="24" height="24" rx="6" fill="#1877F2" />
        <path d="M16 12.5H13.5V20H10.5V12.5H9V10H10.5V8.2C10.5 6.7 11.4 5.5 13.5 5.5H15.8V8H14.3C13.6 8 13.5 8.3 13.5 8.9V10H16L16 12.5Z" fill="#ffffff" />
      </svg>
    )
  }

  if (norm.includes('whatsapp')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="24" height="24" rx="6" fill="#25D366" />
        <path d="M17.5 6.5A7.8 7.8 0 0 0 6.5 17.5L5.5 20.5L8.7 19.5A7.8 7.8 0 1 0 17.5 6.5ZM12 18.2C10.4 18.2 8.9 17.6 7.7 16.7L7.3 16.5L5.7 17L6.2 15.4L6 15C5 13.7 4.7 12 5.1 10.4C5.7 8 7.7 6.1 10.1 5.6C13.2 4.9 16.2 6.8 17 9.8C17.7 12.6 15.9 15.8 13.1 16.5C12.7 16.6 12.4 16.6 12 16.6V18.2Z" fill="#ffffff" />
      </svg>
    )
  }

  if (norm.includes('linkedin')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="24" height="24" rx="6" fill="#0A66C2" />
        <rect x="5.5" y="9.5" width="3" height="9" fill="#ffffff" />
        <circle cx="7" cy="6.5" r="1.6" fill="#ffffff" />
        <path d="M11 9.5H13.8V10.8C14.2 10.1 15.1 9.3 16.7 9.3C19.5 9.3 20.2 11.1 20.2 13.5V18.5H17.2V14.2C17.2 13 17 11.8 15.6 11.8C14.1 11.8 13.8 13 13.8 14.3V18.5H10.8V9.5H11Z" fill="#ffffff" />
      </svg>
    )
  }

  if (norm.includes('google')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="24" height="24" rx="6" fill="#ffffff" stroke="#e0e0e0" />
        <path d="M18.8 12.2C18.8 11.7 18.7 11.3 18.6 10.9H12V13.4H15.9C15.7 14.3 15.1 15.1 14.3 15.6V17.5H16.8C18.2 16.1 19 14.1 19 12.2H18.8Z" fill="#4285F4" />
        <path d="M12 19C13.9 19 15.5 18.4 16.8 17.4L14.3 15.5C13.6 16 12.9 16.3 12 16.3C10.2 16.3 8.7 15.1 8.2 13.5H5.6V15.5C6.9 18.1 9.6 19 12 19Z" fill="#34A853" />
        <path d="M8.2 13.5C8 12.9 8 12.3 8 11.7C8 11.1 8 10.5 8.2 10H5.6V12.1H5.6C5.1 13.1 5.1 14.3 5.6 15.4L8.2 13.5Z" fill="#FBBC05" />
        <path d="M12 7.2C13 7.2 14 7.6 14.7 8.3L16.8 6.2C15.5 5 13.9 4.3 12 4.3C9.6 4.3 6.9 5.8 5.6 8.3L8.2 10.3C8.7 8.6 10.2 7.2 12 7.2Z" fill="#EA4335" />
      </svg>
    )
  }

  if (norm.includes('youtube')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="24" height="24" rx="6" fill="#FF0000" />
        <path d="M10 8.5L15.5 12L10 15.5V8.5Z" fill="#ffffff" />
      </svg>
    )
  }

  if (norm.includes('tiktok')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="24" height="24" rx="6" fill="#000000" />
        <path d="M15.5 6C14.7 7 13.8 7.5 12.7 7.6V14C12.7 15.5 11.4 16.7 9.9 16.7C8.4 16.7 7.1 15.4 7.1 13.9C7.1 12.4 8.4 11.1 9.9 11.1C10.2 11.1 10.5 11.2 10.8 11.3V9.1C10.5 9 10.2 9 9.9 9C7.2 9 5 11.2 5 13.9C5 16.6 7.2 18.8 9.9 18.8C12.6 18.8 14.8 16.6 14.8 13.9V9.8C15.8 10.5 17 10.9 18.3 10.9V8.8C17 8.7 15.9 7.6 15.5 6Z" fill="#ffffff" />
      </svg>
    )
  }

  if (norm.includes('pinterest')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="24" height="24" rx="6" fill="#E60023" />
        <path d="M12 5C8.1 5 5 8.1 5 12C5 15 6.9 17.5 9.5 18.5C9.4 17.9 9.3 17 9.4 16.2L10.3 12.5C10 11.9 10.3 11 10.9 11C11.5 11 11.8 11.5 11.8 12.1C11.8 13 11.2 14.3 10.9 15.4C10.7 16.1 11.3 16.8 12 16.8C13.5 16.8 14.7 14.9 14.7 12.4C14.7 10.2 13.2 8.6 11 8.6C8.5 8.6 6.9 10.5 6.9 12.6C6.9 13.5 7.2 14.4 7.6 14.9C7.7 15.1 7.7 15.2 7.6 15.5L7.4 16.3C7.3 16.5 7.1 16.6 6.9 16.5C5.8 15.7 5.1 14 5.1 12.4C5.1 9.4 7.5 6.8 11.4 6.8C14.5 6.8 17 9.1 17 12.3C17 15.6 15.1 18.2 12.2 18.2C11.3 18.2 10.4 17.7 10.1 17.1L9.5 19.4C9.2 20.4 8.5 21.6 8.1 22.2C9.3 22.6 10.6 22.8 12 22.8C18 22.8 22.8 18 22.8 12C22.8 8.1 18 5 12 5Z" fill="#ffffff" />
      </svg>
    )
  }

  if (norm.includes('twitter') || norm.includes('x')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="24" height="24" rx="6" fill="#111111" />
        <path d="M16.3 5H18.5L13.7 10.7L19.4 18.5H14.9L11.4 13.8L7.3 18.5H5.1L10.2 12.4L4.7 5H9.3L12.5 9.3L16.3 5ZM15.5 17.2H16.7L8.6 6.2H7.3L15.5 17.2Z" fill="#ffffff" />
      </svg>
    )
  }

  // Other / Generic
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="6" fill="#2d3748" />
      <rect x="6" y="6" width="5" height="5" rx="1.5" fill="#ffffff" />
      <rect x="13" y="6" width="5" height="5" rx="1.5" fill="#ffffff" />
      <rect x="6" y="13" width="5" height="5" rx="1.5" fill="#ffffff" />
      <rect x="13" y="13" width="5" height="5" rx="1.5" fill="#ffffff" />
    </svg>
  )
}

export function FormatDeviceMockup({ type, channel }: { type: 'phone' | 'desktop' | 'grid' | 'cover' | 'square'; channel: string }) {
  const norm = channel.toLowerCase()
  let accent = '#1877F2'
  if (norm.includes('instagram')) accent = '#dd2a7b'
  else if (norm.includes('whatsapp')) accent = '#25D366'
  else if (norm.includes('linkedin')) accent = '#0A66C2'
  else if (norm.includes('google')) accent = '#4285F4'
  else if (norm.includes('youtube')) accent = '#FF0000'
  else if (norm.includes('pinterest')) accent = '#E60023'
  else if (norm.includes('tiktok') || norm.includes('twitter') || norm.includes('x')) accent = '#222222'

  if (type === 'phone') {
    return (
      <div className="format-mockup format-mockup--phone">
        <div className="format-mockup__phone-bezel">
          <div className="format-mockup__notch" />
          <div className="format-mockup__screen" style={{ '--accent-color': accent } as React.CSSProperties}>
            <div className="format-mockup__post-header">
              <span className="format-mockup__avatar" />
              <span className="format-mockup__line" />
            </div>
            <div className="format-mockup__post-body">
              <span className="format-mockup__star" />
            </div>
            <div className="format-mockup__post-footer">
              <span className="format-mockup__line sm" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (type === 'desktop') {
    return (
      <div className="format-mockup format-mockup--desktop">
        <div className="format-mockup__laptop-screen">
          <div className="format-mockup__browser-bar">
            <span className="dot" /><span className="dot" /><span className="dot" />
          </div>
          <div className="format-mockup__desktop-content" style={{ '--accent-color': accent } as React.CSSProperties}>
            <div className="format-mockup__banner-rect">
              <span className="format-mockup__star" />
            </div>
          </div>
        </div>
        <div className="format-mockup__laptop-base" />
      </div>
    )
  }

  if (type === 'cover') {
    return (
      <div className="format-mockup format-mockup--cover">
        <div className="format-mockup__cover-card">
          <div className="format-mockup__cover-header" style={{ '--accent-color': accent } as React.CSSProperties}>
            <span className="format-mockup__star" />
          </div>
          <div className="format-mockup__cover-info">
            <span className="format-mockup__circle-avatar" />
            <div className="format-mockup__text-lines">
              <span className="format-mockup__line" />
              <span className="format-mockup__line sm" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (type === 'square') {
    return (
      <div className="format-mockup format-mockup--square">
        <div className="format-mockup__avatar-card" style={{ '--accent-color': accent } as React.CSSProperties}>
          <div className="format-mockup__circle-main">
            <span className="format-mockup__star" />
          </div>
          <span className="format-mockup__line" style={{ width: '40%', marginTop: 8 }} />
        </div>
      </div>
    )
  }

  // Grid / Variados
  return (
    <div className="format-mockup format-mockup--grid">
      <div className="format-mockup__grid-box">
        <div className="format-mockup__grid-item" style={{ background: '#f0f4ef' }} />
        <div className="format-mockup__grid-item" style={{ background: '#e2ece4' }} />
        <div className="format-mockup__grid-item" style={{ background: '#e2ece4' }} />
        <div className="format-mockup__grid-item" style={{ background: '#f0f4ef' }} />
        <div className="format-mockup__grid-center-icon">
          <span className="format-mockup__star" />
        </div>
      </div>
    </div>
  )
}
