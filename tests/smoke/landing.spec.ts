import { test, expect, type Route } from '@playwright/test'

const navItems: Array<{ id: string; label: string }> = [
  { id: 'outcomes', label: 'Outcomes' },
  { id: 'capabilities', label: 'Capabilities' },
  { id: 'plans', label: 'Plans' },
  { id: 'exclusivity', label: 'Exclusivity' },
  { id: 'security', label: 'Security' },
  { id: 'contact', label: 'Contact' },
]

async function mockContact(route: Route) {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true, intent: 'elite_availability' }),
  })
}

test.describe('Marketing landing', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/contact', mockContact)
    await page.goto('/')
  })

  test('shows single marketing nav with login CTA and smooth anchors', async ({ page }) => {
    const navButtons = page.locator('header nav button')
    await expect(navButtons).toHaveCount(navItems.length)
    await expect(page.getByRole('link', { name: 'Login' }).first()).toBeVisible()

    for (const { id, label } of navItems) {
      await page.click(`header >> text=${label}`)
      const target = page.locator(`#${id}`)
      await expect(target).toBeVisible()
      const box = await target.boundingBox()
      expect(box?.y ?? 0).toBeGreaterThanOrEqual(0)
    }
  })

  test('contact form validation and success', async ({ page }) => {
    await page.click('text=Check availability')
    await expect(page.locator('#contact-error')).toBeVisible()
    const activeName = await page.evaluate(() => (document.activeElement as HTMLElement | null)?.getAttribute('name'))
    expect(activeName).toBe('name')

    await page.fill('input[name="name"]', 'Coach Taylor')
    await page.selectOption('select[name="role"]', { label: 'Head Coach' })
    await page.fill('input[name="school"]', 'Dillon Panthers')
    await page.selectOption('select[name="state"]', { value: 'TX' })
    await page.selectOption('select[name="classification"]', { value: '6A' })
    await page.fill('input[name="region"]', 'Region 1')
    await page.fill('input[name="email"]', 'coach@example.com')
    await page.selectOption('select[name="plan"]', { value: 'Elite' })

    await page.click('text=Check availability')
    await expect(page.locator('[role="status"]')).toContainText('We have your info')
  })
})
