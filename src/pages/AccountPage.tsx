import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { Building2, Check, ChevronRight, CircleDollarSign, Download, Eye, FileText, Layers3, LogOut, Plus, ReceiptText, ShoppingBag, Sparkles, UserPlus, Users, X } from 'lucide-react'
import { useApp } from '../AppContext'
import { api } from '../services/api'

type AccountTab = 'visao' | 'creditos' | 'contratos' | 'time' | 'marcas'
const TEAM_COLORS = ['#cfe8df', '#d9defb', '#f7d5e8', '#f8e5bd', '#cfe5f4', '#dcebc8']

const accountNav: Array<{ id: AccountTab; icon: LucideIcon; label: string }> = [
  { id: 'visao', icon: Layers3, label: 'Visão geral' },
  { id: 'creditos', icon: CircleDollarSign, label: 'Créditos' },
  { id: 'contratos', icon: FileText, label: 'Planos e contratos' },
  { id: 'time', icon: Users, label: 'Time' },
  { id: 'marcas', icon: Building2, label: 'Marcas' },
]

function formatDate(value: string | null | undefined, includeTime = false) {
  if (!value) return 'Não informado'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Não informado'
  return new Intl.DateTimeFormat('pt-BR', includeTime ? { dateStyle: 'short', timeStyle: 'short' } : { dateStyle: 'short' }).format(date)
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)
}

function Modal({ children, className = '', onClose, labelId }: { children: ReactNode; className?: string; onClose: () => void; labelId: string }) {
  return createPortal(
    <div className={`account-modal ${className}`.trim()} role="dialog" aria-modal="true" aria-labelledby={labelId} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      {children}
    </div>,
    document.body,
  )
}

export function AccountPage({ onLogout }: { onLogout: () => void }) {
  const navigate = useNavigate()
  const { workspace, members, brands, account, addMember, addBrand, refreshAccount, notify } = useApp()
  const [tab, setTab] = useState<AccountTab>('visao')
  const [showInvite, setShowInvite] = useState(false)
  const [showBrand, setShowBrand] = useState(false)
  const [showTeam, setShowTeam] = useState(false)
  const [showCredits, setShowCredits] = useState(false)
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null)
  const [teamMemberDraft, setTeamMemberDraft] = useState<string[]>([])
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('Membro')
  const [brandName, setBrandName] = useState('')
  const [brandDescription, setBrandDescription] = useState('')
  const [brandColor, setBrandColor] = useState('#004c46')
  const [newTeam, setNewTeam] = useState('')
  const [teamColor, setTeamColor] = useState(TEAM_COLORS[0])
  const [saving, setSaving] = useState(false)

  const accountWorkspace = account?.workspace
  const teams = useMemo(() => account?.teams ?? [], [account?.teams])
  const contracts = account?.contracts ?? []
  const creditEntries = account?.creditTransactions ?? []
  const creditPackages = account?.creditPackages ?? []
  const credits = accountWorkspace?.creditsAvailable ?? workspace?.credits ?? 0
  const allowance = accountWorkspace?.creditAllowance ?? 0
  const creditBank = accountWorkspace?.creditBank ?? 0
  const creditsUsed = accountWorkspace?.creditsUsed ?? 0
  const boosters = accountWorkspace?.boosters ?? 0
  const plan = accountWorkspace?.plan ?? workspace?.plan ?? 'Sem plano'
  const planUsage = allowance > 0 ? Math.min(100, Math.round((creditsUsed / allowance) * 100)) : 0
  const currentContract = contracts.find((contract) => contract.status === 'Vigente') ?? contracts[0]
  const editingTeam = teams.find((team) => team.id === editingTeamId)
  const assignedMembers = useMemo(() => new Set(teams.flatMap((team) => team.memberIds)).size, [teams])
  const hasOpenModal = showInvite || showBrand || showTeam || showCredits || Boolean(editingTeam)

  useEffect(() => {
    if (!hasOpenModal) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [hasOpenModal])

  const submitInvite = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    try {
      await addMember({ name: inviteName, email: inviteEmail, jobTitle: inviteRole })
      await refreshAccount()
      setInviteName('')
      setInviteEmail('')
      setShowInvite(false)
    } catch {
      // A mensagem específica já é exibida pelo contexto.
    } finally { setSaving(false) }
  }

  const submitBrand = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    try {
      await addBrand({ name: brandName, description: brandDescription || 'Marca gerenciada', color: brandColor })
      setBrandName('')
      setBrandDescription('')
      setShowBrand(false)
    } catch {
      // A mensagem específica já é exibida pelo contexto.
    } finally { setSaving(false) }
  }

  const createTeam = async (event: FormEvent) => {
    event.preventDefault()
    if (!newTeam.trim()) return
    setSaving(true)
    try {
      await api.createTeam({ name: newTeam.trim(), color: teamColor })
      await refreshAccount()
      setNewTeam('')
      setTeamColor(TEAM_COLORS[0])
      setShowTeam(false)
      notify('Equipe criada com sucesso')
    } catch (error: unknown) {
      notify(error instanceof Error ? error.message : 'Erro ao criar equipe')
    } finally { setSaving(false) }
  }

  const openTeamEditor = (teamId: string) => {
    const team = teams.find((item) => item.id === teamId)
    if (!team) return
    setTeamMemberDraft(team.memberIds)
    setEditingTeamId(teamId)
  }

  const toggleTeamMember = (memberId: string) => {
    setTeamMemberDraft((current) => current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId])
  }

  const saveTeam = async () => {
    if (!editingTeam) return
    setSaving(true)
    try {
      await api.updateTeamMembers(editingTeam.id, teamMemberDraft)
      await refreshAccount()
      setEditingTeamId(null)
      notify('Equipe atualizada')
    } catch (error: unknown) {
      notify(error instanceof Error ? error.message : 'Erro ao atualizar equipe')
    } finally { setSaving(false) }
  }

  const purchaseCredits = async (packageId: string, packageName: string) => {
    setSaving(true)
    try {
      await api.purchaseCredits(packageId)
      await refreshAccount()
      setShowCredits(false)
      notify(`Pacote ${packageName} contratado e saldo atualizado`)
    } catch (error: unknown) {
      notify(error instanceof Error ? error.message : 'Erro ao contratar créditos')
    } finally { setSaving(false) }
  }

  const downloadStatement = () => {
    if (creditEntries.length === 0) return notify('Não há movimentações para baixar')
    const rows = creditEntries.map((entry) => [entry.description, entry.type, entry.status, entry.amount, entry.createdAt])
    const csv = [['Atividade', 'Tipo', 'Status', 'Créditos', 'Data'], ...rows].map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(';')).join('\n')
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    link.download = 'extrato-creditos.csv'
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return <div className="page account-admin-page">
    <header className="account-admin-header">
      <div><span className="eyebrow">Administração</span><h1>Conta</h1><p>Contrato, créditos, pessoas e marcas do seu workspace.</p></div>
      <button type="button" className="secondary-button" onClick={onLogout}><LogOut size={16} /> Sair</button>
    </header>

    <nav className="account-tabs" aria-label="Seções da conta">
      {accountNav.map(({ id, icon: Icon, label }) => <button type="button" key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}><Icon size={17} /> {label}</button>)}
    </nav>

    {tab === 'visao' && <section className="account-overview">
      <div className="account-metric-grid">
        <article><span>Plano atual</span><strong>{plan}</strong><small>{currentContract?.endsAt ? `Contrato ativo até ${formatDate(currentContract.endsAt)}` : 'Sem vigência cadastrada'}</small><button type="button" onClick={() => setTab('contratos')}>Ver contrato <ChevronRight size={14} /></button></article>
        <article><span>Saldo disponível</span><strong>{credits}</strong><small>{allowance} contratados · {creditBank} no banco</small><button type="button" onClick={() => setTab('creditos')}>Gerenciar créditos <ChevronRight size={14} /></button></article>
        <article><span>Pessoas</span><strong>{members.length}</strong><small>{assignedMembers} distribuídas em {teams.length} equipe(s)</small><button type="button" onClick={() => setTab('time')}>Gerenciar time <ChevronRight size={14} /></button></article>
        <article><span>Marcas</span><strong>{brands.length}</strong><small>Brand Kits disponíveis</small><button type="button" onClick={() => setTab('marcas')}>Gerenciar marcas <ChevronRight size={14} /></button></article>
      </div>
      <div className="contract-highlight">
        <div><span className="plan-badge">{plan}</span><h2>{currentContract ? 'Contrato vigente' : 'Nenhum contrato vigente'}</h2><p>Você utilizou {creditsUsed} de {allowance} créditos neste ciclo.</p></div>
        <div className="contract-highlight__usage"><span><b>Uso no ciclo</b><strong>{planUsage}%</strong></span><i><em style={{ width: `${planUsage}%` }} /></i><small>Fechamento em {formatDate(accountWorkspace?.cycleEnd)}</small></div>
      </div>
    </section>}

    {tab === 'creditos' && <section className="account-section">
      <header className="account-section__header"><div><h2>Controle de créditos</h2><p>Consulte o saldo, o banco de créditos e toda movimentação do ciclo.</p></div><button type="button" className="primary-button" onClick={() => setShowCredits(true)} disabled={creditPackages.length === 0}><ShoppingBag size={16} /> Comprar créditos</button></header>
      <div className="credits-layout">
        <aside className="credits-summary"><span className="plan-badge">{plan}</span><small>Saldo disponível para a empresa</small><strong>{credits}</strong><p>Saldo efetivo registrado no workspace</p><div><span><b>Banco de créditos</b><em>{creditBank} créditos</em></span><span><b>Booster</b><em>{boosters} disponível(is)</em></span></div></aside>
        <div className="credit-statement"><header><div><h3>Extrato</h3><p>Período atual: {formatDate(accountWorkspace?.cycleStart)} a {formatDate(accountWorkspace?.cycleEnd)}</p></div><button type="button" className="secondary-button" onClick={downloadStatement}><Download size={15} /> Baixar extrato</button></header>
          <div className="statement-head"><span>Atividade</span><span>Tipo</span><span>Status</span><span>Valor</span></div>
          {creditEntries.map((entry) => <div className="statement-row" key={entry.id}><span><b>{entry.description}</b><small>{formatDate(entry.createdAt, true)}</small></span><span>{entry.type}</span><span>{entry.status}</span><strong className={entry.amount < 0 ? 'is-negative' : ''}>{entry.amount > 0 ? '+' : ''} {entry.amount} créditos</strong></div>)}
          {creditEntries.length === 0 && <div className="account-empty-row">Nenhuma movimentação registrada neste ciclo.</div>}
        </div>
      </div>
    </section>}

    {tab === 'contratos' && <section className="account-section">
      <header className="account-section__header"><div><h2>Planos e contratos</h2><p>Acompanhe valores, vigência, upgrades e downgrades registrados.</p></div></header>
      {currentContract ? <article className="current-contract"><div><span className="plan-badge">{currentContract.plan}</span><strong>{formatCurrency(currentContract.amountCents)}</strong><small>{currentContract.endsAt ? `Contrato ativo até ${formatDate(currentContract.endsAt)}` : 'Contrato sem data final'}</small></div>{currentContract.documentUrl && <a className="secondary-button" href={currentContract.documentUrl} target="_blank" rel="noreferrer"><Eye size={16} /> Visualizar contrato</a>}<footer><span><b>Créditos usados no ciclo</b><strong>{planUsage}%</strong><i><em style={{ width: `${planUsage}%` }} /></i></span><span><b>Benefícios por ciclo</b><small><Check size={13} /> {allowance} créditos</small><small><Check size={13} /> {boosters} Booster(s)</small></span></footer></article> : <EmptyState icon={<FileText size={24} />} title="Nenhum contrato cadastrado" text="Quando um contrato for registrado, seus dados aparecerão aqui." />}
      <div className="contract-history"><h3>Histórico de contratos</h3>{contracts.map((contract) => <div key={contract.id}><ReceiptText size={19} /><span><b>{contract.title}</b><small>{formatDate(contract.startsAt)}{contract.endsAt ? ` — ${formatDate(contract.endsAt)}` : ''} · {contract.changeType}</small></span><em className={contract.status === 'Vigente' ? 'active' : ''}>{contract.status}</em>{contract.documentUrl ? <a href={contract.documentUrl} target="_blank" rel="noreferrer" aria-label={`Visualizar ${contract.title}`}><Eye size={16} /></a> : <span className="contract-document-missing" title="Documento não anexado">—</span>}</div>)}{contracts.length === 0 && <div className="account-empty-row">Nenhum histórico de contrato registrado.</div>}</div>
    </section>}

    {tab === 'time' && <section className="account-section">
      <header className="account-section__header"><div><h2>Time e equipes</h2><p>Convide usuários e organize o acesso por equipes.</p></div><div className="account-section__actions"><button className="secondary-button" type="button" onClick={() => setShowTeam(true)}><Plus size={16} /> Criar equipe</button><button className="primary-button" type="button" onClick={() => setShowInvite(true)}><UserPlus size={16} /> Convidar usuário</button></div></header>
      <div className="team-admin-grid">
        <div className="team-members-card"><h3>Membros ({members.length})</h3>{members.map((member) => <div className="member-row" key={member.id}><span className="member-avatar" style={{ background: member.avatarColor || '#d7ff70' }}>{member.avatarUrl ? <img src={member.avatarUrl} alt="" /> : member.avatarInitials}</span><span><b>{member.name}</b><small>{member.email}</small></span><em>{member.jobTitle || 'Membro'}</em></div>)}{members.length === 0 && <div className="account-empty-row">Nenhum membro cadastrado.</div>}</div>
        <div className="teams-card"><h3>Equipes ({teams.length})</h3>{teams.map((team) => <article key={team.id}><i className="team-color-dot" style={{ background: team.color }} /><span><b>{team.name}</b><small>{team.memberIds.length} membro(s)</small></span><div className="mini-avatar-stack">{members.filter((member) => team.memberIds.includes(member.id)).slice(0, 4).map((member) => <i key={member.id} style={{ background: member.avatarColor }}>{member.avatarInitials}</i>)}</div><button type="button" className="team-manage-button" onClick={() => openTeamEditor(team.id)}>Gerenciar</button></article>)}{teams.length === 0 && <div className="account-empty-row">Nenhuma equipe criada.</div>}</div>
      </div>
    </section>}

    {tab === 'marcas' && <section className="account-section">
      <header className="account-section__header"><div><h2>Marcas gerenciadas</h2><p>Cada marca possui seu próprio Brand Kit e recursos.</p></div><button className="primary-button" type="button" onClick={() => setShowBrand(true)}><Plus size={16} /> Nova marca</button></header>
      <div className="managed-brand-grid">{brands.map((brand) => <article key={brand.id}><span style={{ background: brand.color }}>{brand.initials}</span><div><h3>{brand.name}</h3><p>{brand.description}</p></div><button className="secondary-button" type="button" onClick={() => navigate(`/brand-kit?marca=${encodeURIComponent(brand.id)}`)}>Gerenciar <ChevronRight size={14} /></button></article>)}{brands.length === 0 && <EmptyState icon={<Building2 size={24} />} title="Nenhuma marca cadastrada" text="Crie a primeira marca para liberar seu Brand Kit." />}</div>
    </section>}

    {showInvite && <Modal onClose={() => setShowInvite(false)} labelId="invite-title"><form onSubmit={submitInvite}><ModalHeader id="invite-title" title="Convidar usuário" text="O usuário receberá acesso ao workspace." onClose={() => setShowInvite(false)} /><label>Nome<input value={inviteName} onChange={(event) => setInviteName(event.target.value)} required /></label><label>E-mail<input type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} required /></label><label>Função<select value={inviteRole} onChange={(event) => setInviteRole(event.target.value)}><option>Membro</option><option>Gestor</option><option>Aprovador</option></select></label><ModalFooter onClose={() => setShowInvite(false)} saving={saving} action="Enviar convite" /></form></Modal>}

    {showBrand && <Modal onClose={() => setShowBrand(false)} labelId="brand-title"><form onSubmit={submitBrand}><ModalHeader id="brand-title" title="Criar nova marca" text="Ela ficará disponível na entrada do Brand Kit." onClose={() => setShowBrand(false)} /><label>Nome da marca<input value={brandName} onChange={(event) => setBrandName(event.target.value)} required /></label><label>Descrição<input value={brandDescription} onChange={(event) => setBrandDescription(event.target.value)} placeholder="Ex.: Marca de produtos digitais" /></label><label>Cor da marca<div className="color-field"><input type="color" value={brandColor} onChange={(event) => setBrandColor(event.target.value)} /><span>{brandColor}</span></div></label><ModalFooter onClose={() => setShowBrand(false)} saving={saving} action="Criar marca" /></form></Modal>}

    {showTeam && <Modal onClose={() => setShowTeam(false)} labelId="create-team-title"><form onSubmit={createTeam}><ModalHeader id="create-team-title" title="Criar equipe" text="Informe um nome e escolha uma cor de identificação." onClose={() => setShowTeam(false)} /><label>Nome da equipe<input value={newTeam} onChange={(event) => setNewTeam(event.target.value)} placeholder="Ex.: Conteúdo" required /></label><fieldset className="team-color-picker"><legend>Cor da equipe</legend><div>{TEAM_COLORS.map((color) => <label key={color} title={color}><input type="radio" name="team-color" value={color} checked={teamColor === color} onChange={() => setTeamColor(color)} /><span style={{ background: color }}><Check size={15} /></span></label>)}</div></fieldset><ModalFooter onClose={() => setShowTeam(false)} saving={saving} action="Criar equipe" /></form></Modal>}

    {editingTeam && <Modal onClose={() => setEditingTeamId(null)} labelId="team-title"><div className="team-editor"><ModalHeader id="team-title" title={`Equipe ${editingTeam.name}`} text="Selecione quem participa desta equipe." onClose={() => setEditingTeamId(null)} /><div className="team-editor__members">{members.map((member) => <label key={member.id}><input type="checkbox" checked={teamMemberDraft.includes(member.id)} onChange={() => toggleTeamMember(member.id)} /><span className="member-avatar" style={{ background: member.avatarColor || '#d7ff70' }}>{member.avatarInitials}</span><span><b>{member.name}</b><small>{member.email}</small></span></label>)}</div><footer><button type="button" className="primary-button" onClick={saveTeam} disabled={saving}><Check size={15} /> Salvar equipe</button></footer></div></Modal>}

    {showCredits && <Modal className="account-modal--credits" onClose={() => setShowCredits(false)} labelId="credits-title"><div><header><div><Sparkles size={22} /><span><h2 id="credits-title">Comprar créditos extras</h2><p>O pacote selecionado atualiza o saldo e registra a movimentação.</p></span></div><button type="button" onClick={() => setShowCredits(false)} aria-label="Fechar"><X size={18} /></button></header><div className="credit-packages">{creditPackages.map((pack) => <article className={pack.recommended ? 'recommended' : ''} key={pack.id}>{pack.recommended && <em>Recomendado</em>}<span>{pack.name}</span>{pack.bonusPercent > 0 && <small>+{pack.bonusPercent}% de bônus</small>}<strong>{pack.credits} créditos</strong><p>por {formatCurrency(pack.priceCents)}</p><button className="secondary-button" type="button" disabled={saving} onClick={() => purchaseCredits(pack.id, pack.name)}>Selecionar</button></article>)}{creditPackages.length === 0 && <EmptyState icon={<ShoppingBag size={24} />} title="Nenhum pacote disponível" text="Os pacotes ativos cadastrados aparecerão aqui." />}</div></div></Modal>}
  </div>
}

function ModalHeader({ id, title, text, onClose }: { id: string; title: string; text: string; onClose: () => void }) {
  return <header><div><h2 id={id}>{title}</h2><p>{text}</p></div><button type="button" onClick={onClose} aria-label="Fechar"><X size={18} /></button></header>
}

function ModalFooter({ onClose, saving, action }: { onClose: () => void; saving: boolean; action: string }) {
  return <footer><button type="button" className="secondary-button" onClick={onClose}>Cancelar</button><button type="submit" className="primary-button" disabled={saving}>{action}</button></footer>
}

function EmptyState({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return <div className="account-empty-state">{icon}<h3>{title}</h3><p>{text}</p></div>
}
