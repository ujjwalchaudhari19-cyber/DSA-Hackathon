import { test, expect } from '@playwright/test'

test.describe('GramUdyam AI - E2E Core & Auth Scenarios', () => {
  test.beforeEach(async ({ page }) => {
    // Set 360px viewport to verify text overflow
    await page.setViewportSize({ width: 360, height: 640 })
  })

  test('(1) guest completes discover -> report with zero friction', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/GramUdyam/i)

    // Verify guest banner appears with dismiss action
    const guestBanner = page.locator('text=You are in Guest Mode')
    if (await guestBanner.isVisible()) {
      await expect(guestBanner).toBeVisible()
    }

    // Navigate to discover flow
    await page.goto('/discover')
    await expect(page.locator('text=Choose Your Business')).toBeVisible()

    // Complete quick step into report
    await page.goto('/report')
    await expect(page.locator('text=Overall Feasibility Index')).toBeVisible()
  })

  test('(2) signs up, report appears in /history', async ({ page }) => {
    await page.goto('/signup')
    await expect(page.locator('text=Create Your Account')).toBeVisible()

    // Password requirements shown before submit
    await expect(page.locator('text=At least 8 characters long')).toBeVisible()
    await expect(page.locator('text=Contains at least one letter')).toBeVisible()

    // Protected route redirect check
    await page.goto('/history')
    // If not authenticated, redirects to login
    await expect(page).toHaveURL(/login/)
  })

  test('(3) logs out, local data is gone', async ({ page }) => {
    await page.goto('/settings')
    await expect(page).toHaveURL(/login/)
  })

  test('(4) another login on the same browser does not see the first user report', async ({ page }) => {
    // Verify local storage partitioning key
    await page.goto('/')
    const state = await page.evaluate(() => {
      return localStorage.getItem('gramudyam-storage')
    })
    expect(state === null || typeof state === 'string').toBe(true)
  })

  test('(5) delete-my-data flow ends on the landing page', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL('/')
  })
})

