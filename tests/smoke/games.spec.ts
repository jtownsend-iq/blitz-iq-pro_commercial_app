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
    await page.getByRole('button', { name: /Enter BlitzIQ Pro/i }).click()
    await page.waitForLoadState('networkidle')

    await page.goto('/games')
    await page.fill('input[name="opponent_name"]', opponent)
    await page.fill('input[name="start_time"]', kickoff)
    await page.selectOption('select[name="home_away"]', 'HOME')

    await page.getByRole('button', { name: /Create game/i }).click()
    await page.waitForLoadState('networkidle')

    const gameHeader = page.getByRole('heading', { name: opponent, exact: false })
    await expect(gameHeader).toBeVisible({ timeout: 20000 })
    const gameCard = gameHeader.locator('xpath=../..')
    await expect(gameCard.getByText(/HOME/i)).toBeVisible({ timeout: 20000 })
  })
})
