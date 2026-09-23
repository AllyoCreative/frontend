import { useMemo, useRef, useState } from 'react'
import { Bell, Camera, Check, KeyRound, LockKeyhole, Mail, MessageCircle, UserRound } from 'lucide-react'
import { useApp } from '../AppContext'
import type { UserSummary } from '../services/api'

type ProfileTab = 'dados' | 'preferencias'
type Channel = 'whatsapp' | 'email'
type PreferenceKey = 'taskCreated' | 'taskDisabled' | 'highUsage' | 'lowUsage' | 'cycleStart' | 'reviewReady' | 'reviewReminder' | 'autoApproved' | 'deliveryChanged'

const DEFAULT_PREFERENCES: Record<PreferenceKey, Record<Channel, boolean>> = {
  taskCreated: { whatsapp: true, email: true },
  taskDisabled: { whatsapp: true, email: true },
  highUsage: { whatsapp: true, email: false },
  lowUsage: { whatsapp: true, email: false },
  cycleStart: { whatsapp: true, email: false },
  reviewReady: { whatsapp: true, email: true },
  reviewReminder: { whatsapp: true, email: true },
  autoApproved: { whatsapp: true, email: true },
  deliveryChanged: { whatsapp: true, email: true },
}

const preferenceGroups: Array<{ title: string; description: string; items: Array<{ key: PreferenceKey; title: string; description: string; recommended?: boolean }> }> = [
  {
    title: 'Notificações gerais',
    description: 'Movimentações importantes das suas solicitações e tarefas.',
    items: [
      { key: 'taskCreated', title: 'Tarefa criada', description: 'Você foi adicionado como responsável em uma nova tarefa.', recommended: true },
      { key: 'taskDisabled', title: 'Tarefa inativada', description: 'Uma tarefa sob sua responsabilidade foi inativada.', recommended: true },
      { key: 'highUsage', title: 'Aviso de uso alto de franquia', description: 'Você está atingindo o limite da sua franquia.' },
      { key: 'lowUsage', title: 'Aviso de incentivo de uso', description: 'Você está usando menos créditos do que o esperado.' },
      { key: 'cycleStart', title: 'Aviso de virada de ciclo', description: 'Seu novo ciclo começou e os créditos já estão disponíveis.' },
    ],
  },
  {
    title: 'Notificações de aprovações',
    description: 'Atualizações de tarefas concluídas, pendentes e aprovações automáticas.',
    items: [
      { key: 'reviewReady', title: 'Tarefa entregue para sua avaliação', description: 'Uma entrega está disponível para a sua empresa.', recommended: true },
      { key: 'reviewReminder', title: 'Lembrete de aprovação pendente', description: 'Há uma tarefa aguardando seu retorno na plataforma.', recommended: true },
      { key: 'autoApproved', title: 'Tarefa aprovada automaticamente', description: 'Uma entrega foi aprovada após o prazo de resposta.' },
    ],
  },
  {
    title: 'Notificações de atualizações',
    description: 'Mudanças relevantes nas tarefas, como prazo ou andamento.',
    items: [
      { key: 'deliveryChanged', title: 'Alteração na data de entrega', description: 'A data de entrega de uma tarefa foi atualizada.' },
    ],
  },
]

function loadPreferences(serverPreferences?: UserSummary['notificationPreferences']): Record<PreferenceKey, Record<Channel, boolean>> {
  if (serverPreferences && Object.keys(serverPreferences).length > 0) {
    return { ...DEFAULT_PREFERENCES, ...serverPreferences } as Record<PreferenceKey, Record<Channel, boolean>>
  }
  try {
    const saved = window.localStorage.getItem('allyo-notification-preferences')
    return saved ? { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) as Record<PreferenceKey, Record<Channel, boolean>> } : DEFAULT_PREFERENCES
  } catch {
    return DEFAULT_PREFERENCES
  }
}

export function ProfilePage() {
  const { currentUser } = useApp()
  if (!currentUser) return <div className="page profile-page"><div className="loading-screen"><span /><p>Carregando perfil...</p></div></div>
  return <ProfileEditor key={currentUser.id} currentUser={currentUser} />
}

function ProfileEditor({ currentUser }: { currentUser: UserSummary }) {
  const { updateProfile, notify } = useApp()
  const [tab, setTab] = useState<ProfileTab>('dados')
  const [name, setName] = useState(currentUser?.name || '')
  const [phone, setPhone] = useState(currentUser?.phone || '')
  const [timezone, setTimezone] = useState(currentUser?.timezone || 'America/Sao_Paulo')
  const [language, setLanguage] = useState(currentUser?.language || 'pt')
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl || '')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [preferences, setPreferences] = useState(() => loadPreferences(currentUser.notificationPreferences))
  const fileInput = useRef<HTMLInputElement>(null)

  const initials = useMemo(() => name.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'US', [name])

  const handleAvatar = (file?: File) => {
    if (!file) return
    if (!file.type.startsWith('image/') || file.size > 1_500_000) {
      notify('Escolha uma imagem de até 1,5 MB')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setAvatarUrl(String(reader.result || ''))
    reader.readAsDataURL(file)
  }

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault()
    if (newPassword && newPassword.length < 8) {
      setPasswordError('Use pelo menos 8 caracteres.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('As senhas não coincidem.')
      return
    }
    setPasswordError('')
    await updateProfile({ name, phone, timezone, language, avatarUrl: avatarUrl || null, ...(newPassword ? { newPassword } : {}) })
    setNewPassword('')
    setConfirmPassword('')
  }

  const togglePreference = (key: PreferenceKey, channel: Channel) => {
    setPreferences((current) => ({
      ...current,
      [key]: { ...current[key], [channel]: !current[key][channel] },
    }))
  }

  const savePreferences = async () => {
    window.localStorage.setItem('allyo-notification-preferences', JSON.stringify(preferences))
    await updateProfile({ notificationPreferences: preferences })
  }

  return <div className="page profile-page">
    <header className="profile-page__header">
      <div>
        <span className="eyebrow">Configurações pessoais</span>
        <h1>Meu perfil</h1>
        <p>Seus dados, segurança e preferências de comunicação.</p>
      </div>
    </header>

    <div className="profile-tabs" role="tablist" aria-label="Seções do perfil">
      <button className={tab === 'dados' ? 'active' : ''} onClick={() => setTab('dados')} type="button"><UserRound size={17} /> Perfil e segurança</button>
      <button className={tab === 'preferencias' ? 'active' : ''} onClick={() => setTab('preferencias')} type="button"><Bell size={17} /> Preferências</button>
    </div>

    {tab === 'dados' ? <form className="profile-form" onSubmit={saveProfile}>
      <section className="profile-section profile-section--identity">
        <div className="profile-section__heading">
          <div><h2>Foto e dados pessoais</h2><p>Estas informações identificam você no seu time.</p></div>
        </div>
        <div className="profile-avatar-editor">
          <button type="button" className="profile-avatar-large" onClick={() => fileInput.current?.click()} aria-label="Alterar foto de perfil">
            {avatarUrl ? <img src={avatarUrl} alt="Foto de perfil" /> : <span>{initials}</span>}
            <i><Camera size={15} /></i>
          </button>
          <div><strong>Avatar ou foto</strong><p>JPG ou PNG com até 1,5 MB.</p><button type="button" className="text-button" onClick={() => fileInput.current?.click()}>Escolher imagem</button></div>
          <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(event) => handleAvatar(event.target.files?.[0])} />
        </div>
        <div className="profile-fields">
          <label>Nome completo<input value={name} onChange={(event) => setName(event.target.value)} required /></label>
          <label>E-mail<input value={currentUser?.email || ''} readOnly /></label>
          <label>Telefone<input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="(11) 99999-9999" /></label>
          <label>Fuso horário<select value={timezone} onChange={(event) => setTimezone(event.target.value)}><option value="America/Sao_Paulo">Brasília (GMT-3)</option><option value="America/Fortaleza">Fortaleza (GMT-3)</option><option value="America/Manaus">Manaus (GMT-4)</option><option value="Europe/Lisbon">Lisboa</option></select></label>
          <label>Idioma<select value={language} onChange={(event) => setLanguage(event.target.value)}><option value="pt">Português (Brasil)</option><option value="en">English</option><option value="es">Español</option></select></label>
        </div>
      </section>

      <section className="profile-section">
        <div className="profile-section__heading"><div><h2>Trocar senha</h2><p>Crie uma senha segura com no mínimo 8 caracteres.</p></div><LockKeyhole size={20} /></div>
        <div className="profile-fields profile-fields--password">
          <label>Nova senha<div className="field-with-icon"><KeyRound size={16} /><input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" /></div></label>
          <label>Confirmar nova senha<div className="field-with-icon"><KeyRound size={16} /><input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" /></div></label>
        </div>
        {passwordError && <p className="form-error">{passwordError}</p>}
      </section>

      <footer className="profile-save"><button className="primary-button" type="submit"><Check size={16} /> Salvar alterações</button></footer>
    </form> : <section className="preferences-panel">
      <header><div><h2>Preferências de notificações</h2><p>Escolha quais avisos quer receber e por qual canal.</p></div><div className="preference-channel-head"><span><MessageCircle size={17} /> WhatsApp</span><span><Mail size={17} /> E-mail</span></div></header>
      {preferenceGroups.map((group) => <div className="preference-group" key={group.title}>
        <aside><h3>{group.title}</h3><p>{group.description}</p></aside>
        <div className="preference-table">
          {group.items.map((item) => <div className="preference-row" key={item.key}>
            <div><strong>{item.title}</strong>{item.recommended && <small>Desativação não recomendada</small>}<p>{item.description}</p></div>
            {(['whatsapp', 'email'] as Channel[]).map((channel) => <button key={channel} type="button" className={`toggle ${preferences[item.key][channel] ? 'active' : ''}`} role="switch" aria-checked={preferences[item.key][channel]} aria-label={`${item.title} por ${channel}`} onClick={() => togglePreference(item.key, channel)}><span /></button>)}
          </div>)}
        </div>
      </div>)}
      <footer><button type="button" className="primary-button" onClick={savePreferences}><Check size={16} /> Salvar preferências</button></footer>
    </section>}
  </div>
}
