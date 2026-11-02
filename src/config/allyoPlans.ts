export interface AllyoPlanEntitlement {
  label: string
  included: boolean
}

interface PlanCatalogEntry {
  users: string
  creditBank: string
  creditBankIncluded: boolean
  accountManager: boolean
}

const PLAN_CATALOG: Record<string, PlanCatalogEntry> = {
  lite: { users: 'Até 5 usuários', creditBank: 'Banco de créditos', creditBankIncluded: false, accountManager: false },
  pro: { users: 'Até 10 usuários', creditBank: '50% de banco de créditos', creditBankIncluded: true, accountManager: true },
  premium: { users: 'Usuários ilimitados', creditBank: 'Banco de créditos ilimitado', creditBankIncluded: true, accountManager: true },
  enterprise: { users: 'Usuários ilimitados', creditBank: 'Banco de créditos ilimitado', creditBankIncluded: true, accountManager: true },
}

const planKey = (plan: string) => plan.trim().toLocaleLowerCase('pt-BR')

export function allyoPlanEntitlements(input: {
  plan: string
  creditAllowance: number
  simultaneousTaskLimit: number
  boosterIncluded: boolean
  monthlyBoosterUnits: number
}): AllyoPlanEntitlement[] {
  const catalog = PLAN_CATALOG[planKey(input.plan)]
  const taskLimit = input.simultaneousTaskLimit >= 1000
    ? 'Tarefas simultâneas ilimitadas'
    : `${input.simultaneousTaskLimit} tarefa${input.simultaneousTaskLimit === 1 ? '' : 's'} simultânea${input.simultaneousTaskLimit === 1 ? '' : 's'}`
  const boosterLabel = input.boosterIncluded
    ? `${input.monthlyBoosterUnits} Booster${input.monthlyBoosterUnits === 1 ? '' : 's'} gratuito${input.monthlyBoosterUnits === 1 ? '' : 's'} por ciclo`
    : 'Boosters gratuitos'

  return [
    { label: `${input.creditAllowance} créditos mensais`, included: input.creditAllowance > 0 },
    { label: 'Entregas a partir de 24h', included: true },
    { label: taskLimit, included: true },
    ...(catalog ? [{ label: catalog.users, included: true }] : []),
    { label: 'Alterações ilimitadas', included: true },
    ...(catalog ? [{ label: catalog.creditBank, included: catalog.creditBankIncluded }] : []),
    { label: boosterLabel, included: input.boosterIncluded },
    ...(catalog ? [{ label: 'Creative Account Manager', included: catalog.accountManager }] : []),
    { label: 'Creative Account Support', included: true },
    { label: 'Art Director', included: true },
  ]
}
