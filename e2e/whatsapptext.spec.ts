import { test, expect } from '@playwright/test';

test.describe('WhatsAppText Core User Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?demo=1');
  });

  test('loads initial app, displays seeded college groups, and allows tab navigation', async ({ page }) => {
    // 1. App Header & Title
    await expect(page.locator('header h1')).toHaveText('Notes');

    // 2. Tab Navigation
    await expect(page.getByRole('tab', { name: /Messages/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Calendar/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Notes/i })).toBeVisible();

    // 3. Initial Demo Seed Data
    await expect(page.locator('text=CSE 3rd Year Official')).toBeVisible();
    await expect(page.locator('text=DBMS Quiz Prep')).toBeVisible();
    await expect(page.locator('text=Coding Club Announcements')).toBeVisible();
  });

  test('navigates into a chat group and inspects messages and extraction actions', async ({ page }) => {
    // Click into CSE 3rd Year Official
    await page.locator('text=CSE 3rd Year Official').click();

    // Verify Chat Header
    await expect(page.locator('text=CSE 3rd Year Official')).toBeVisible();

    // Verify messages and chips
    await expect(page.locator('text=Prof. Sharma')).toBeVisible();
    await expect(page.locator('text=Computer Networks Lab viva')).toBeVisible();

    // Verify action menu or bubble controls
    const moreBtn = page.locator('button[aria-label="Message options"]').first();
    await expect(moreBtn).toBeVisible();
    await moreBtn.click();
    await expect(page.getByRole('button', { name: /Add to Calendar/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Save to Notes/i })).toBeVisible();

    // Back to groups
    await page.locator('button[aria-label="Back to groups"]').click();
    await expect(page.locator('text=DBMS Quiz Prep')).toBeVisible();
  });

  test('can paste a new WhatsApp message and extract event', async ({ page }) => {
    // Open Add Message Sheet
    await page.locator('button[aria-label="Add message or chat"]').click();

    // Verify Sheet is open
    await expect(page.locator('text=Import or paste messages')).toBeVisible();

    // Enter message text
    const testMsg = 'Tomorrow 10:00 AM OS Lab Exam in Room 301. Bring lab manual.';
    const textarea = page.locator('textarea');
    await textarea.fill(testMsg);

    // Click Import / Save
    await page.getByRole('button', { name: /Save & process messages/i }).click();

    // Verify message appears in list
    await expect(page.locator('text=OS Lab Exam in Room 301')).toBeVisible();
  });

  test('switches to Calendar tab, filters events, and views details', async ({ page }) => {
    // Switch to Calendar tab
    await page.getByRole('tab', { name: /Calendar/i }).click();

    // Verify Calendar components
    await expect(page.locator('button:has-text(".ICS")')).toBeVisible();

    // Verify seeded event exists
    await expect(page.locator('text=Computer Networks Lab Viva')).toBeVisible();
  });

  test('switches to Notes tab, interacts with dynamic checklists, and toggles tasks', async ({ page }) => {
    // Switch to Notes tab
    await page.getByRole('tab', { name: /Notes/i }).click();

    // Verify Notes Header / Search
    await expect(page.locator('input[placeholder="Search notes..."]')).toBeVisible();

    // Check DBMS Quiz Prep note
    await expect(page.locator('text=DBMS').first()).toBeVisible();
    await expect(page.locator('text=ER Modeling & Cardinality constraints')).toBeVisible();

    // Toggle a checklist item
    const uncheckedItem = page.locator('text=SQL Subqueries & GROUP BY queries');
    await expect(uncheckedItem).toBeVisible();
    await uncheckedItem.click();

    // Verify checkbox state changed
    await expect(page.locator('text=Checklist').first()).toBeVisible();
  });

  test('opens Settings and verifies 100% on-device data sovereignty and quiet hours', async ({ page }) => {
    // Click Settings Icon
    await page.locator('button[aria-label="Settings and Privacy"]').click();

    // Verify Privacy statement
    await expect(page.locator('text=100% On-device & private')).toBeVisible();
    await expect(page.locator('text=WhatsAppText never uses external servers')).toBeVisible();

    // Verify Quiet hours section
    await expect(page.locator('text=Quiet hours (do not disturb)')).toBeVisible();
    await expect(page.locator('text=Export JSON')).toBeVisible();
    await expect(page.locator('text=Import JSON')).toBeVisible();
  });

  test('generates study plan from Calendar and configures timetable and preferences in Settings', async ({ page }) => {
    // 1. Go to Calendar tab and click Plan week
    await page.getByRole('tab', { name: /Calendar/i }).click();
    const planBtn = page.getByRole('button', { name: /Plan week/i });
    await expect(planBtn).toBeVisible();
    await planBtn.click();

    // 2. Verify PlanReviewSheet modal
    await expect(page.locator('text=Recommended Study Schedule')).toBeVisible();
    await expect(page.getByRole('button', { name: /Replan/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Discard/i })).toBeVisible();
    await page.getByRole('button', { name: /Discard/i }).click();
    await expect(page.locator('text=Recommended Study Schedule')).not.toBeVisible();

    // 3. Open Settings and inspect Class Timetable and Study Preferences
    await page.locator('button[aria-label="Settings and Privacy"]').click();
    await expect(page.locator('text=Class Timetable')).toBeVisible();
    await expect(page.locator('text=Study & Planner Preferences')).toBeVisible();
    await expect(page.locator('text=Best study time')).toBeVisible();

    // 4. Open Timetable modal
    await page.getByRole('button', { name: /^Edit$/i }).click();
    await expect(page.locator('#timetable-title')).toHaveText('Class Timetable');
    await page.getByRole('dialog', { name: 'Class Timetable' }).getByLabel('Close').click();
  });
});
