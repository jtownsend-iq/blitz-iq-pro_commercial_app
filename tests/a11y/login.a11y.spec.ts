import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('A11y: auth/login', () => {
  test('login page has no critical or serious violations', async ({ page }) => {
    await page.goto('/login')
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()

    const violations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    )
    expect(violations, JSON.stringify(violations, null, 2)).toHaveLength(0)
    await expect(page.getByRole('heading', { name: 'Sign in to BlitzIQ Pro' })).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
  })
})
