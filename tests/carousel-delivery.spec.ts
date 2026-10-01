import { expect, test } from '@playwright/test'

const task = {
  id: 'task-carousel',
  publicId: '234567',
  projectId: 'project-carousel',
  title: 'Carrossel de lançamento',
  team: 'Design team',
  status: 'Em revisão',
  delivery: 'Aguardando aprovação',
  deadlineDays: 2,
  orderIndex: 0,
  briefing: {
    inheritedFromProject: true,
    deliverables: ['Carrossel'],
    formats: ['PNG'],
    creativeDirection: [],
    deliverySchema: {
      version: 1,
      taskType: 'carousel',
      structure: 'cards',
      itemLabel: 'card',
      items: [1, 2, 3].map((position) => ({ id: `card-${position}`, position, label: `Card ${position}`, title: '', copy: '', instructions: '', cta: '' })),
    },
  },
}

const designs = [1, 2, 3].map((id) => ({
  id,
  projectId: 'project-carousel',
  taskId: task.id,
  name: `Card ${String(id).padStart(2, '0')}`,
  version: 'v1',
  color: '#d7ff70',
  approved: false,
  contentType: 'application/octet-stream',
  fileKey: `workspaces/workspace-1/designs/card-${id}.png`,
  fileUrl: '/assets/figma/designs_imgImage8.png',
}))

const project = {
  id: 'project-carousel',
  name: 'Campanha de lançamento',
  service: 'Carrossel',
  status: 'Em revisão',
  deadline: 'A definir',
  progress: 80,
  tasks: 1,
  unread: 0,
  accent: '#bde8e1',
  team: [],
  description: 'Campanha',
  tasksList: [task],
}

test('carrossel aparece como uma entrega navegável também nos arquivos', async ({ page }) => {
  let approvalBody: Record<string, unknown> | null = null

  await page.route('http://localhost:4000/api/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    if (path.endsWith('/auth/me')) return route.fulfill({ json: { user: { id: 'user-1', name: 'Cliente', email: 'cliente@allyo.space' }, workspace: { id: 'workspace-1', name: 'Allyo' } } })
    if (path.endsWith('/dashboard/client')) return route.fulfill({ json: { tasks: [task], metrics: { queueCount: 1, pendingReviewCount: 1, averageRating: null, ratingCount: 0 } } })
    if (path.endsWith('/members')) return route.fulfill({ json: [] })
    if (path.endsWith('/account/overview')) return route.fulfill({ json: { workspace: { id: 'workspace-1', name: 'Allyo', plan: 'Demo', creditsAvailable: 10, creditAllowance: 10, creditBank: 0, creditsUsed: 0, boosters: 0 }, members: [], brands: [], teams: [], contracts: [], creditTransactions: [], creditPackages: [] } })
    if (path.endsWith('/projects/project-carousel/messages') || path.endsWith('/projects/project-carousel/files')) return route.fulfill({ json: [] })
    if (path.endsWith('/projects/project-carousel/designs')) return route.fulfill({ json: designs })
    if (/\/designs\/\d+\/review$/.test(path)) {
      const design = designs.find((item) => path.includes(`/designs/${item.id}/`))!
      return route.fulfill({ json: { ...design, comments: [], annotations: [] } })
    }
    if (/\/designs\/\d+\/approval$/.test(path)) {
      approvalBody = request.postDataJSON()
      return route.fulfill({ json: { success: true, id: 2, approved: true, approvedDesignIds: [1, 2, 3], taskId: task.id } })
    }
    if (path.endsWith('/projects/project-carousel')) return route.fulfill({ json: { ...project, briefing: null, designs } })
    if (path.endsWith('/projects')) return route.fulfill({ json: [project] })
    return route.fulfill({ json: {} })
  })

  await page.addInitScript(() => localStorage.setItem('allyo-auth-token', 'carousel-test-token'))
  await page.goto('/projetos/project-carousel/arquivos')

  await expect(page.locator('.project-design-tile--collection')).toHaveCount(1)
  await expect.poll(async () => (await page.locator('.project-design-tile--collection').boundingBox())?.width || 0).toBeLessThan(320)
  await expect(page.locator('.project-delivery-collection-sheet img')).toHaveCount(3)
  await expect(page.getByText('3 cards')).toBeVisible()
  await page.getByRole('button', { name: 'Abrir Carrossel Carrossel de lançamento' }).click()

  await expect(page.getByRole('group', { name: 'Navegação do carrossel' })).toContainText('Card 1')
  await page.getByRole('button', { name: 'Próximo card' }).click()
  await expect(page.getByRole('group', { name: 'Navegação do carrossel' })).toContainText('Card 2')
  await expect(page.locator('.file-review-art[title="Card 02"] img')).toBeVisible()

  await page.getByRole('button', { name: 'Aprovar carrossel' }).click()
  await page.getByRole('button', { name: '5 estrelas' }).click()
  await page.getByRole('button', { name: 'Aprovar e enviar avaliação' }).click()

  await expect.poll(() => approvalBody).toEqual({ approved: true, rating: 5, scope: 'task' })
  await expect(page.getByText('Aprovado', { exact: true }).first()).toBeVisible()
})
