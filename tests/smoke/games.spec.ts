import { test, expect } from '@playwright/test'

const TEST_EMAIL = process.env.TEST_EMAIL
const TEST_PASSWORD = process.env.TEST_PASSWORD

test.describe('Games flow', () => {
  test.skip(!TEST_EMAIL || !TEST_PASSWORD, 'Set TEST_EMAIL and TEST_PASSWORD to run games smoke')

  test('create game and see it in the list', async ({ page }) => {
    const opponent = `Playwright Smoke ${Date.now()}`
    const kickoff = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16) // yyyy-MM-ddTHH:mm

    await page.goto('/login')
    await page.fill('input[type="email"]', TEST_EMAIL!)
    await page.fill('input[type="password"]', TEST_PASSWORD!)
    await page.click('button:has-text("Log in")')
    await page.waitForLoadState('networkidle')

    await page.goto('/games')
    await page.fill('input[name="opponent_name"]', opponent)
    await page.fill('input[name="start_time"]', kickoff)
    await page.selectOption('select[name="home_away"]', 'HOME')

    await page.click('button:has-text("Create game")')
    await page.waitForURL(/\/games/i, { timeout: 10000 })

    const gameRow = page.locator('article', { hasText: opponent }).first()
    await expect(gameRow).toBeVisible()
    await expect(gameRow.getByText('HOME', { exact: false })).toBeVisible()
  })
})
