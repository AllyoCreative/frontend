import { useMemo, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Building2, Check, ChevronRight, CircleDollarSign, Download, Eye, FileText, Layers3, LogOut, Plus, ReceiptText, ShoppingBag, Sparkles, UserPlus, Users, X } from 'lucide-react'
import { useApp } from '../AppContext'

type AccountTab = 'visao' | 'creditos' | 'contratos' | 'time' | 'marcas'

const contractHistory = [
  { name: 'Contrato recorrente', date: 'Ativo até 19/05/2027', status: 'Vigente' },
  { name: 'Upgrade para o plano Pro', date: 'Realizado em 20/05/2025', status: 'Alteração' },
  { name: 'Plano Standard', date: '20/05/2024 — 19/05/2025', status: 'Encerrado' },
]

const creditEntries = [
  { activity: 'Início de ciclo', date: '20/09/2026 • 00:00', type: 'Entrada', amount: '25 créditos' },
  { activity: 'Banco de crédito: 50% da franquia', date: '20/09/2026 • 00:00', type: 'Entrada', amount: '12,5 créditos' },
]

const accountNav: Array<{ id: AccountTab; icon: LucideIcon; label: string }> = [
  { id: 'visao', icon: Layers3, label: 'Visão geral' },
  { id: 'creditos', icon: CircleDollarSign, label: 'Créditos' },
  { id: 'contratos', icon: FileText, label: 'Planos e contratos' },
  { id: 'time', icon: Users, label: 'Time' },
  { id: 'marcas', icon: Building2, label: 'Marcas' },
]

export function AccountPage({ onLogout }: { onLogout: () => void }) {
  const { workspace, members, brands, addMember, addBrand, notify } = useApp()
  const [tab, setTab] = useState<AccountTab>('visao')
  const [showInvite, setShowInvite] = useState(false)
  const [showBrand, setShowBrand] = useState(false)
  const [showCredits, setShowCredits] = useState(false)
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null)
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('Membro')
  const [brandName, setBrandName] = useState('')
  const [brandDescription, setBrandDescription] = useState('')
  const [brandColor, setBrandColor] = useState('#004c46')
  const [teams, setTeams] = useState([{ id: 'marketing', name: 'Marketing', memberIds: members.slice(0, 3).map((member) => member.id) }])
  const [newTeam, setNewTeam] = useState('')
  const credits = workspace?.credits ?? 25
  const usedCredits = 8
  const planUsage = Math.min(100, Math.round((usedCredits / Math.max(credits, 1)) * 100))
  const activeTeamMembers = useMemo(() => teams[0]?.memberIds.length || members.length, [members.length, teams])

  const submitInvite = async (event: React.FormEvent) => {
    event.preventDefault()
    await addMember({ name: inviteName, email: inviteEmail, jobTitle: inviteRole })
    setInviteName('')
    setInviteEmail('')
    setShowInvite(false)
  }

  const submitBrand = (event: React.FormEvent) => {
    event.preventDefault()
    addBrand({ name: brandName, description: brandDescription || 'Marca gerenciada', color: brandColor })
    setBrandName('')
    setBrandDescription('')
    setShowBrand(false)
  }

  const createTeam = (event: React.FormEvent) => {
    event.preventDefault()
    if (!newTeam.trim()) return
    setTeams((current) => [...current, { id: `${Date.now()}`, name: newTeam.trim(), memberIds: [] }])
    setNewTeam('')
    notify('Equipe criada')
  }

  const toggleTeamMember = (teamId: string, memberId: string) => {
    setTeams((current) => current.map((team) => team.id !== teamId ? team : {
      ...team,
      memberIds: team.memberIds.includes(memberId) ? team.memberIds.filter((id) => id !== memberId) : [...team.memberIds, memberId],
    }))
  }

  const editingTeam = teams.find((team) => team.id === editingTeamId)

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
        <article><span>Plano atual</span><strong>{workspace?.plan || 'Pro'}</strong><small>Contrato ativo até 19/05/2027</small><button type="button" onClick={() => setTab('contratos')}>Ver contrato <ChevronRight size={14} /></button></article>
        <article><span>Saldo disponível</span><strong>{credits + 12.5}</strong><small>{credits} contratados + 12,5 no banco</small><button type="button" onClick={() => setTab('creditos')}>Gerenciar créditos <ChevronRight size={14} /></button></article>
        <article><span>Pessoas</span><strong>{members.length}</strong><small>{activeTeamMembers} distribuídas em {teams.length} equipe(s)</small><button type="button" onClick={() => setTab('time')}>Gerenciar time <ChevronRight size={14} /></button></article>
        <article><span>Marcas</span><strong>{brands.length}</strong><small>Brand Kits disponíveis</small><button type="button" onClick={() => setTab('marcas')}>Gerenciar marcas <ChevronRight size={14} /></button></article>
      </div>
      <div className="contract-highlight">
        <div><span className="plan-badge">{workspace?.plan || 'PRO'}</span><h2>Seu ciclo está saudável</h2><p>Você utilizou {usedCredits} de {credits} créditos neste ciclo.</p></div>
        <div className="contract-highlight__usage"><span><b>Uso no ciclo</b><strong>{planUsage}%</strong></span><i><em style={{ width: `${planUsage}%` }} /></i><small>Fechamento em 19 de outubro</small></div>
      </div>
    </section>}

    {tab === 'creditos' && <section className="account-section">
      <header className="account-section__header"><div><h2>Controle de créditos</h2><p>Consulte o saldo, o banco de créditos e toda movimentação do ciclo.</p></div><button type="button" className="primary-button" onClick={() => setShowCredits(true)}><ShoppingBag size={16} /> Comprar créditos</button></header>
      <div className="credits-layout">
        <aside className="credits-summary"><span className="plan-badge">{workspace?.plan || 'PRO'}</span><small>Saldo disponível para a empresa</small><strong>{credits + 12.5}</strong><p>Contratado + banco de créditos</p><div><span><b>Banco de créditos</b><em>12,5 créditos</em></span><span><b>Booster</b><em>1 disponível</em></span></div></aside>
        <div className="credit-statement"><header><div><h3>Extrato</h3><p>Período atual: 20/09/2026 a 19/10/2026</p></div><button type="button" className="secondary-button" onClick={() => notify('Extrato preparado para download')}><Download size={15} /> Baixar extrato</button></header>
          <div className="statement-head"><span>Atividade</span><span>Tipo</span><span>Status</span><span>Valor</span></div>
          {creditEntries.map((entry) => <div className="statement-row" key={entry.activity}><span><b>{entry.activity}</b><small>{entry.date}</small></span><span>{entry.type}</span><span>Processado</span><strong>+ {entry.amount}</strong></div>)}
        </div>
      </div>
    </section>}

    {tab === 'contratos' && <section className="account-section">
      <header className="account-section__header"><div><h2>Planos e contratos</h2><p>Acompanhe valores, vigência, upgrades e downgrades.</p></div><button type="button" className="secondary-button" onClick={() => notify('Comparativo de planos aberto')}>Comparar planos</button></header>
      <article className="current-contract"><div><span className="plan-badge">{workspace?.plan || 'PRO'}</span><strong>R$ 5.339,13</strong><small>Contrato ativo até 19/05/2027</small></div><button className="secondary-button" type="button" onClick={() => notify('Contrato aberto')}><Eye size={16} /> Visualizar contrato</button><footer><span><b>Créditos usados no ciclo</b><strong>{planUsage}%</strong><i><em style={{ width: `${planUsage}%` }} /></i></span><span><b>Benefícios por ciclo</b><small><Check size={13} /> {credits} créditos</small><small><Check size={13} /> 1 Booster</small></span></footer></article>
      <div className="contract-history"><h3>Histórico de contratos</h3>{contractHistory.map((contract) => <div key={`${contract.name}-${contract.date}`}><ReceiptText size={19} /><span><b>{contract.name}</b><small>{contract.date}</small></span><em className={contract.status === 'Vigente' ? 'active' : ''}>{contract.status}</em><button type="button" aria-label={`Visualizar ${contract.name}`} onClick={() => notify('Documento aberto')}><Eye size={16} /></button></div>)}</div>
    </section>}

    {tab === 'time' && <section className="account-section">
      <header className="account-section__header"><div><h2>Time e equipes</h2><p>Convide usuários e organize o acesso por equipes.</p></div><button className="primary-button" type="button" onClick={() => setShowInvite(true)}><UserPlus size={16} /> Convidar usuário</button></header>
      <div className="team-admin-grid">
        <div className="team-members-card"><h3>Membros ({members.length})</h3>{members.map((member) => <div className="member-row" key={member.id}><span className="member-avatar" style={{ background: member.avatarColor || '#d7ff70' }}>{member.avatarUrl ? <img src={member.avatarUrl} alt="" /> : member.avatarInitials}</span><span><b>{member.name}</b><small>{member.email}</small></span><em>{member.jobTitle || 'Membro'}</em></div>)}</div>
        <div className="teams-card"><h3>Equipes ({teams.length})</h3>{teams.map((team) => <article key={team.id}><span><b>{team.name}</b><small>{team.memberIds.length} membro(s)</small></span><div className="mini-avatar-stack">{members.filter((member) => team.memberIds.includes(member.id)).slice(0, 4).map((member) => <i key={member.id} style={{ background: member.avatarColor }}>{member.avatarInitials}</i>)}</div><button type="button" className="team-manage-button" onClick={() => setEditingTeamId(team.id)}>Gerenciar</button></article>)}<form onSubmit={createTeam}><input value={newTeam} onChange={(event) => setNewTeam(event.target.value)} placeholder="Nome da nova equipe" /><button className="secondary-button" type="submit"><Plus size={15} /> Criar equipe</button></form></div>
      </div>
    </section>}

    {tab === 'marcas' && <section className="account-section">
      <header className="account-section__header"><div><h2>Marcas gerenciadas</h2><p>Cada marca possui seu próprio Brand Kit e recursos.</p></div><button className="primary-button" type="button" onClick={() => setShowBrand(true)}><Plus size={16} /> Nova marca</button></header>
      <div className="managed-brand-grid">{brands.map((brand) => <article key={brand.id}><span style={{ background: brand.color }}>{brand.initials}</span><div><h3>{brand.name}</h3><p>{brand.description}</p></div><button className="secondary-button" type="button" onClick={() => notify(`${brand.name} selecionada`)}>Gerenciar <ChevronRight size={14} /></button></article>)}</div>
    </section>}

    {showInvite && <div className="account-modal" role="dialog" aria-modal="true" aria-labelledby="invite-title"><form onSubmit={submitInvite}><header><div><h2 id="invite-title">Convidar usuário</h2><p>O usuário receberá acesso ao workspace.</p></div><button type="button" onClick={() => setShowInvite(false)} aria-label="Fechar"><X size={18} /></button></header><label>Nome<input value={inviteName} onChange={(event) => setInviteName(event.target.value)} required /></label><label>E-mail<input type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} required /></label><label>Função<select value={inviteRole} onChange={(event) => setInviteRole(event.target.value)}><option>Membro</option><option>Gestor</option><option>Aprovador</option></select></label><footer><button type="button" className="secondary-button" onClick={() => setShowInvite(false)}>Cancelar</button><button type="submit" className="primary-button">Enviar convite</button></footer></form></div>}

    {showBrand && <div className="account-modal" role="dialog" aria-modal="true" aria-labelledby="brand-title"><form onSubmit={submitBrand}><header><div><h2 id="brand-title">Criar nova marca</h2><p>Ela ficará disponível na entrada do Brand Kit.</p></div><button type="button" onClick={() => setShowBrand(false)} aria-label="Fechar"><X size={18} /></button></header><label>Nome da marca<input value={brandName} onChange={(event) => setBrandName(event.target.value)} required /></label><label>Descrição<input value={brandDescription} onChange={(event) => setBrandDescription(event.target.value)} placeholder="Ex.: Marca de produtos digitais" /></label><label>Cor da marca<div className="color-field"><input type="color" value={brandColor} onChange={(event) => setBrandColor(event.target.value)} /><span>{brandColor}</span></div></label><footer><button type="button" className="secondary-button" onClick={() => setShowBrand(false)}>Cancelar</button><button type="submit" className="primary-button">Criar marca</button></footer></form></div>}

    {editingTeam && <div className="account-modal" role="dialog" aria-modal="true" aria-labelledby="team-title"><div className="team-editor"><header><div><h2 id="team-title">Equipe {editingTeam.name}</h2><p>Selecione quem participa desta equipe.</p></div><button type="button" onClick={() => setEditingTeamId(null)} aria-label="Fechar"><X size={18} /></button></header><div className="team-editor__members">{members.map((member) => <label key={member.id}><input type="checkbox" checked={editingTeam.memberIds.includes(member.id)} onChange={() => toggleTeamMember(editingTeam.id, member.id)} /><span className="member-avatar" style={{ background: member.avatarColor || '#d7ff70' }}>{member.avatarInitials}</span><span><b>{member.name}</b><small>{member.email}</small></span></label>)}</div><footer><button type="button" className="primary-button" onClick={() => { setEditingTeamId(null); notify('Equipe atualizada') }}><Check size={15} /> Salvar equipe</button></footer></div></div>}

    {showCredits && <div className="account-modal account-modal--credits" role="dialog" aria-modal="true" aria-labelledby="credits-title"><div><header><div><Sparkles size={22} /><span><h2 id="credits-title">Comprar créditos extras</h2><p>Créditos não utilizados serão somados ao seu banco.</p></span></div><button type="button" onClick={() => setShowCredits(false)} aria-label="Fechar"><X size={18} /></button></header><div className="credit-packages">{[{ name: 'Starter', credits: 13, price: '2.563' }, { name: 'Standard', credits: 39, price: '7.368', recommended: true }, { name: 'Growth', credits: 65, price: '11.746' }].map((pack) => <article className={pack.recommended ? 'recommended' : ''} key={pack.name}>{pack.recommended && <em>Recomendado</em>}<span>{pack.name}</span><small>+30% de bônus</small><strong>{pack.credits} créditos</strong><p>por R$ {pack.price},00</p><button className="secondary-button" type="button" onClick={() => { notify(`Pacote ${pack.name} solicitado`); setShowCredits(false) }}>Selecionar</button></article>)}</div></div></div>}
  </div>
}
