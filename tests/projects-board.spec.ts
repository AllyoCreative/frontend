import { expect, test } from '@playwright/test'

const completedProject = {
  id: 'project-done', name: 'Projeto encerrado', service: 'Estático', status: 'Em revisão', deadline: '2026-09-28T10:55:57.460Z', progress: 80, tasks: 1, unread: 0, accent: '#bde8e1', team: [], description: '', favorite: false, createdAt: '2026-09-26T09:00:00.000Z',
  tasksList: [{ id: 'task-done', publicId: '100001', projectId: 'project-done', title: 'Key visual aprovado', team: 'Design team', status: 'Concluído', delivery: 'Aprovado', deadlineAt: '2026-09-28T10:55:57.460Z', deadlineDays: 1, createdAt: '2026-09-26T09:00:00.000Z', briefing: { inheritedFromProject: true, deliverables: [], formats: [], creativeDirection: [] } }],
}

const activeProject = {
  id: 'project-active', name: 'Campanha em produção', service: 'Carrossel', status: 'Em andamento', deadline: '2026-09-30T18:30:00.000Z', progress: 30, tasks: 2, unread: 2, accent: '#d7ff70', team: [], description: '', favorite: false, createdAt: '2026-09-27T12:00:00.000Z',
  tasksList: [
    { id: 'task-copy', publicId: '100002', projectId: 'project-active', title: 'Legenda para redes sociais', team: 'Copy team', status: 'Em andamento', deadlineAt: '2026-09-29T17:30:00.000Z', deadlineDays: 2, createdAt: '2026-09-27T12:00:00.000Z', briefing: { inheritedFromProject: true, deliverables: [], formats: [], creativeDirection: [] } },
    { id: 'task-design', publicId: '100003', projectId: 'project-active', title: 'Carrossel principal', team: 'Design team', status: 'Bloqueada', deadlineAt: '2026-09-30T18:30:00.000Z', deadlineDays: 3, createdAt: '2026-09-27T12:00:00.000Z', briefing: { inheritedFromProject: true, deliverables: [], formats: [], creativeDirection: [] } },
  ],
}

test('lista e calendário refletem status, favorito, prazos e faixas das tarefas', async ({ page }) => {
  let favoriteRequest = 0

  await page.route('http://localhost:4000/api/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    if (path === '/api/projects') return route.fulfill({ json: [completedProject, activeProject] })
    if (path === '/api/projects/project-done/favorite' && request.method() === 'PATCH') {
      favoriteRequest += 1
      return route.fulfill({ json: { id: 'project-done', favorite: true } })
    }
    if (path.endsWith('/auth/me')) return route.fulfill({ json: { user: { id: 'user-1', name: 'Levy', email: 'levy@allyo.space' }, workspace: { id: 'workspace-1', name: 'Allyo' } } })
    if (path.endsWith('/members')) return route.fulfill({ json: [] })
    if (path.endsWith('/account/overview')) return route.fulfill({ json: { workspace: { id: 'workspace-1', name: 'Allyo', plan: 'Demo', creditsAvailable: 10, creditAllowance: 10, creditsUsed: 0 }, members: [], brands: [], teams: [], contracts: [], creditTransactions: [], creditPackages: [] } })
    return route.fulfill({ json: {} })
  })

  await page.addInitScript(() => localStorage.setItem('allyo-auth-token', 'projects-test-token'))
  await page.setViewportSize({ width: 1512, height: 900 })
  await page.goto('/projetos')

  await expect(page.getByText('2026-09-28T10:55:57.460Z')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Concluído 1' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Abrir projeto Projeto encerrado' })).toBeVisible()
  await expect(page.getByText('Prazo: 28 de set, 07:55').first()).toBeVisible()

  const completedSection = page.locator('.projects-group').filter({ has: page.getByRole('button', { name: 'Concluído 1' }) })
  await completedSection.getByRole('button', { name: 'Concluído 1' }).click()
  await expect(page.getByRole('button', { name: 'Abrir projeto Projeto encerrado' })).toBeHidden()
  await completedSection.getByRole('button', { name: 'Concluído 1' }).click()

  const favorite = page.getByRole('button', { name: 'Adicionar Projeto encerrado aos favoritos' })
  await favorite.click()
  await expect.poll(() => favoriteRequest).toBe(1)
  await expect(page.getByRole('button', { name: 'Remover Projeto encerrado dos favoritos' })).toHaveAttribute('aria-pressed', 'true')

  const mainBox = await page.locator('.projects-screen__main').boundingBox()
  const asideBox = await page.locator('.projects-allocation-panel').boundingBox()
  expect(mainBox && asideBox && mainBox.x + mainBox.width <= asideBox.x).toBe(true)
  await page.screenshot({ path: '/private/tmp/allyo-projects-status-list.png', fullPage: true })

  await page.getByRole('button', { name: 'Calendário' }).click()
  await expect(page.locator('.projects-calendar__event--range').filter({ hasText: 'Legenda para redes sociais' })).toBeVisible()
  await expect(page.locator('.projects-calendar__event--range').filter({ hasText: 'Carrossel principal' })).toBeVisible()
  await expect(page.locator('.projects-calendar__event--range')).toHaveCount(6)
  await page.screenshot({ path: '/private/tmp/allyo-projects-task-calendar.png', fullPage: true })
})
