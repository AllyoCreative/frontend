import { useState } from 'react'
import { ArrowRight, BrainCircuit, CheckCircle2, FileText, History, MessageSquareText, Plus, Search, ShieldCheck, Sparkles } from 'lucide-react'
import { useApp } from '../AppContext'

const memories = [
  { icon: MessageSquareText, title: 'Tom de voz', text: 'Próximo, direto e confiante. Evitar jargões corporativos e superlativos vazios.', count: '12 referências' },
  { icon: ShieldCheck, title: 'Regras visuais', text: 'Composição limpa, alto contraste e acentos vibrantes sobre bases neutras.', count: '18 referências' },
  { icon: History, title: 'Feedback aprendido', text: 'Preferência por layouts modulares, títulos curtos e fotografia espontânea.', count: '34 feedbacks' },
  { icon: FileText, title: 'Contexto do negócio', text: 'Allyo é a operação criativa que combina talento, processos e inteligência de marca.', count: '9 documentos' },
]

export function BrandBrainPage() {
  const [question, setQuestion] = useState('')
  const { notify } = useApp()
  return <div className="page brain-page">
    <header className="page-header"><div><span className="eyebrow">Inteligência de marca</span><h1>Brand Brain</h1><p>O contexto vivo da sua marca, aprendido a cada projeto.</p></div><button className="primary-button" onClick={() => notify('Fonte adicionada à fila de processamento')}><Plus size={17} /> Adicionar conhecimento</button></header>
    <section className="brain-hero"><div className="brain-orbit"><BrainCircuit size={38} /><i /><i /><i /></div><div><span className="ai-badge"><Sparkles size={14} /> Sempre aprendendo</span><h2>A Allyo já entende sua marca.</h2><p>Diretrizes, decisões e feedbacks viram contexto útil para criar briefings melhores, reduzir retrabalho e manter consistência.</p><div className="brain-stats"><span><strong>73</strong> fontes conectadas</span><span><strong>96%</strong> de confiança</span><span><strong>Hoje</strong> última atualização</span></div></div></section>
    <form className="brain-search" onSubmit={(event) => { event.preventDefault(); if (question.trim()) { notify('Resposta gerada com base no Brand Brain'); setQuestion('') } }}><Search size={18} /><input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Pergunte algo sobre sua marca..." /><button disabled={!question.trim()}><ArrowRight size={17} /></button></form>
    <div className="memory-grid">{memories.map(({ icon: Icon, title, text, count }) => <article key={title}><span><Icon size={20} /></span><h2>{title}</h2><p>{text}</p><footer><span>{count}</span><button>Explorar <ArrowRight size={14} /></button></footer></article>)}</div>
    <section className="learning-feed"><div className="section-heading"><div><span className="eyebrow">Aprendizado recente</span><h2>O que o Brain incorporou</h2></div></div><div><article><CheckCircle2 size={18} /><p><strong>Preferência visual confirmada</strong><span>Você aprovou três composições com tipografia grande e contraste alto.</span></p><time>Hoje</time></article><article><CheckCircle2 size={18} /><p><strong>Novo termo de marca</strong><span>“Operação criativa” foi identificado como expressão central em novos documentos.</span></p><time>Ontem</time></article></div></section>
  </div>
}
