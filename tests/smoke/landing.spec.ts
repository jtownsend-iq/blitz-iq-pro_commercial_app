import { test, expect } from '@playwright/test'

test.describe('Auth gateway', () => {
  test('redirects home to login', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByRole('heading', { name: 'Sign in to BlitzIQ Pro' })).toBeVisible()
  })

  test('renders login form inputs and CTA', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
    await expect(page.getByRole('button', { name: /Enter BlitzIQ Pro/i })).toBeVisible()
  })
})
