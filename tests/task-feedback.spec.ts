import { expect, test } from '@playwright/test'

const task = { id: 'task-1', publicId: '123456', projectId: 'project-1', title: 'Key visual principal', team: 'Design team', status: 'Em revisão', delivery: 'Aguardando aprovação', deadlineDays: 2, orderIndex: 0, briefing: { inheritedFromProject: true, deliverables: [], formats: [], creativeDirection: [] }, projectName: 'Campanha Q1', reviewDesignId: 1 }
const design = { id: 1, projectId: 'project-1', taskId: 'task-1', name: 'Key visual principal', version: 'v3', color: '#d7ff70', approved: false }
const project = { id: 'project-1', name: 'Campanha Q1', service: 'Estático', status: 'Em revisão', deadline: 'A definir', progress: 80, tasks: 1, unread: 0, accent: '#bde8e1', team: [], description: 'Campanha', tasksList: [task] }

test('cliente avalia a entrega ao aprovar uma tarefa', async ({ page }) => {
  let approvalBody: Record<string, unknown> | null = null

  await page.route('http://localhost:4000/api/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    if (path.endsWith('/dashboard/client')) return route.fulfill({ json: { tasks: [task], metrics: { queueCount: 1, pendingReviewCount: 1, averageRating: 4.8, ratingCount: 5 } } })
    if (path.endsWith('/auth/me')) return route.fulfill({ json: { user: { id: 'user-1', name: 'Levy', email: 'levy@allyo.space' }, workspace: { id: 'workspace-1', name: 'Allyo' } } })
    if (path.endsWith('/members')) return route.fulfill({ json: [] })
    if (path.endsWith('/account/overview')) return route.fulfill({ json: { workspace: { id: 'workspace-1', name: 'Allyo', plan: 'Demo', creditsAvailable: 10, creditAllowance: 10, creditBank: 0, creditsUsed: 0, boosters: 0, cycleStart: null, cycleEnd: null, contractStart: null, contractEnd: null }, members: [], brands: [], teams: [], contracts: [], creditTransactions: [], creditPackages: [] } })
    if (path.endsWith('/projects/project-1/messages') || path.endsWith('/projects/project-1/files')) return route.fulfill({ json: [] })
    if (path.endsWith('/projects/project-1/designs')) return route.fulfill({ json: [design] })
    if (path.endsWith('/projects/project-1')) return route.fulfill({ json: { ...project, briefing: null, designs: [design] } })
    if (path.endsWith('/projects')) return route.fulfill({ json: [project] })
    if (path.endsWith('/designs/1/approval')) {
      approvalBody = request.postDataJSON()
      return route.fulfill({ json: { success: true, id: 1, approved: true, taskId: 'task-1', feedback: { rating: 5, comment: 'Entrega excelente.' } } })
    }
    return route.fulfill({ json: {} })
  })

  await page.addInitScript(() => localStorage.setItem('allyo-auth-token', 'feedback-test-token'))
  await page.goto('/')

  await expect(page.getByText('Key visual principal')).toBeVisible()
  await expect(page.locator('.home-rating-summary')).toContainText('4,8')
  await page.getByText('Key visual principal').click()
  await expect(page).toHaveURL(/\/projetos\/project-1\/designs/)
  await page.getByRole('button', { name: 'Abrir Key visual principal' }).click()
  await page.getByRole('button', { name: 'Marcar como aprovado' }).click()
  await page.getByRole('button', { name: '5 estrelas' }).click()
  await page.getByPlaceholder(/Conte o que mais gostou/).fill('Entrega excelente.')
  await page.getByRole('button', { name: 'Aprovar e enviar avaliação' }).click()

  await expect.poll(() => approvalBody).toEqual({ approved: true, rating: 5, comment: 'Entrega excelente.' })
  await expect(page.getByText('Aprovado', { exact: true }).first()).toBeVisible()
})
