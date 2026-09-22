import { expect, test } from '@playwright/test'

test('fluxo principal navega entre as áreas do produto', async ({ page }) => {
  await page.setViewportSize({ width: 1512, height: 812 })
  await page.goto('/')
  await expect(page.getByPlaceholder('Digite seu email ou celular')).toBeVisible()
  await page.screenshot({ path: '/private/tmp/allyo-login-desktop.png', fullPage: true })
  await page.getByPlaceholder('Digite seu email ou celular').fill('demo@allyo.space')
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page.getByText('Digite o código que você recebeu no seu email:')).toBeVisible()
  await page.waitForTimeout(800)
  await page.screenshot({ path: '/private/tmp/allyo-login-otp-desktop.png', fullPage: true })
  for (let digit = 1; digit <= 6; digit += 1) {
    await page.getByLabel(`Dígito ${digit}`).fill(String(digit))
  }
  await expect(page.getByRole('heading', { name: 'Allyo Space' })).toBeVisible()
  await page.waitForTimeout(700)
  await page.screenshot({ path: '/private/tmp/allyo-login-welcome-desktop.png', fullPage: true })
  await expect(page.locator('.auth-launch-curtain--active')).toBeVisible()
  await page.waitForTimeout(350)
  await page.screenshot({ path: '/private/tmp/allyo-login-launch-desktop.png', fullPage: true })
  await expect(page.locator('.platform-reveal-curtain')).toBeVisible()
  await page.waitForTimeout(600)
  await page.screenshot({ path: '/private/tmp/allyo-platform-reveal-desktop.png', fullPage: true })

  await expect(page.getByRole('heading', { name: /Vamos arrasar/ })).toBeVisible()
  await expect(page.locator('.platform-reveal-curtain')).toBeHidden()
  await page.waitForTimeout(500)
  await page.screenshot({ path: '/private/tmp/allyo-home-desktop.png', fullPage: true })

  await page.getByRole('link', { name: 'Projetos' }).click()
  await expect(page.getByRole('heading', { name: 'Projetos' })).toBeVisible()
  await page.screenshot({ path: '/private/tmp/allyo-projects-desktop.png', fullPage: true })
  await page.getByPlaceholder('Buscar projetos').fill('Brand Refresh')
  await expect(page.getByRole('heading', { name: 'Brand Refresh Allyo' })).toBeVisible()

  await page.getByRole('link', { name: 'Brand Kit' }).click()
  await expect(page.getByRole('heading', { name: /Brand Kit/ })).toBeVisible()
  await page.screenshot({ path: '/private/tmp/allyo-brand-desktop.png', fullPage: true })
  await page.getByRole('button', { name: /Cores/ }).click()
  await expect(page.getByRole('heading', { name: 'Cores', exact: true })).toBeVisible()
})

test('catálogo cria um projeto mockado', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('allyo-demo-auth', 'true'))
  await page.goto('/novo-projeto')
  await expect(page.getByRole('heading', { name: 'Criação e Design' })).toBeVisible()
  await page.getByRole('heading', { name: 'Landing pages' }).click()
  await page.getByPlaceholder('Ex.: Campanha de lançamento Q3').fill('Portal de parceiros')
  await page.getByPlaceholder('Descreva o desafio, objetivo e entregáveis que imagina...').fill('Criar uma landing page clara para aquisição de novos parceiros.')
  await page.getByRole('button', { name: 'Enviar briefing' }).click()
  await expect(page.getByRole('heading', { name: 'Seu projeto decolou.' })).toBeVisible()
})

test('layout mobile abre navegação sem overflow horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.addInitScript(() => localStorage.setItem('allyo-demo-auth', 'true'))
  await page.goto('/projetos')
  await page.getByRole('button', { name: 'Abrir menu' }).click()
  await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeVisible()
  await page.getByRole('link', { name: 'Início' }).click()
  await expect(page.getByRole('heading', { name: /Vamos arrasar/ })).toBeVisible()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
  expect(overflow).toBe(false)
  await page.screenshot({ path: '/private/tmp/allyo-home-mobile.png', fullPage: true })
})

test('Brand Brain não fica disponível no início da relação com o cliente', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('allyo-demo-auth', 'true'))
  await page.goto('/')

  await expect(page.getByRole('link', { name: 'Brand Brain' })).toHaveCount(0)

  await page.goto('/brand-brain')
  await expect(page).toHaveURL('/')
  await expect(page.getByRole('heading', { name: /Vamos arrasar/ })).toBeVisible()
})

test('design abre a experiência de revisão do Figma', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('allyo-demo-auth', 'true'))
  await page.goto('/projetos/campanha-q1/designs')
  await expect(page.getByRole('heading', { name: 'Designs para revisão' })).toBeVisible()
  await page.getByRole('button', { name: /Abrir/ }).first().click()
  await expect(page.getByRole('dialog', { name: 'Revisão de design' })).toBeVisible()
  await expect(page.getByAltText('Design em revisão')).toBeVisible()
  await page.getByRole('button', { name: 'Fechar revisão' }).click()
  await expect(page.getByRole('dialog', { name: 'Revisão de design' })).toBeHidden()
})
