import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const VIEWPORTS = [
  { width: 360, height: 800, name: '360x800' },
  { width: 390, height: 844, name: '390x844' },
  { width: 412, height: 915, name: '412x915' },
  { width: 412, height: 915, name: '412x915-scale1.3', fontScale: 1.3 },
];

const TABS = [
  { name: 'messages', label: /Messages/i },
  { name: 'calendar', label: /Calendar/i },
  { name: 'notes', label: /Notes/i },
  { name: 'reminders', label: /Reminders/i },
];

test.describe('UI Layout & Design System Verification', () => {
  test.beforeAll(() => {
    const screenshotDir = path.join(process.cwd(), 'e2e', 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
  });

  for (const vp of VIEWPORTS) {
    test.describe(`Viewport: ${vp.name}`, () => {
      for (const tab of TABS) {
        test(`verifies layout and captures screenshot for ${tab.name} at ${vp.name}`, async ({
          page,
        }) => {
          await page.setViewportSize({ width: vp.width, height: vp.height });
          await page.goto('/?demo=1');
          await page.waitForLoadState('networkidle');

          if (vp.fontScale) {
            await page.evaluate((scale) => {
              document.documentElement.style.fontSize = `${scale * 100}%`;
            }, vp.fontScale);
          }

          // Switch to target tab
          const tabButton = page.getByRole('tab', { name: tab.label });
          await tabButton.click();
          await page.waitForTimeout(300);

          // 1. Assert no horizontal page overflow
          const overflow = await page.evaluate(() => {
            const doc = document.documentElement;
            const body = document.body;
            return {
              docScrollWidth: doc.scrollWidth,
              docClientWidth: doc.clientWidth,
              bodyScrollWidth: body.scrollWidth,
              bodyClientWidth: body.clientWidth,
            };
          });

          expect(
            overflow.docScrollWidth,
            `Document scrollWidth (${overflow.docScrollWidth}) should not exceed clientWidth (${overflow.docClientWidth}) at ${vp.name}`
          ).toBeLessThanOrEqual(overflow.docClientWidth + 1);

          // 2. Tab-specific checks for Notes Tab
          if (tab.name === 'notes') {
            const searchInput = page.locator('input[placeholder="Search notes..."]');
            const addNoteBtn = page.getByRole('button', { name: /\+ Note/i });

            await expect(searchInput).toBeVisible();
            await expect(addNoteBtn).toBeVisible();

            const searchBox = await searchInput.boundingBox();
            const btnBox = await addNoteBtn.boundingBox();

            expect(searchBox).not.toBeNull();
            expect(btnBox).not.toBeNull();
          }

          // 3. Verify horizontal gutter alignment
          const alignmentCheck = await page.evaluate((vpWidth) => {
            const errors: string[] = [];
            const elements = document.querySelectorAll(
              'article, .note-card, input, [role="tablist"] button, .btn-primary, [data-card]'
            );

            const isInsideHorizontalScroll = (el: Element): boolean => {
              let parent = el.parentElement;
              while (parent && parent !== document.body) {
                const style = window.getComputedStyle(parent);
                if (
                  style.overflowX === 'auto' ||
                  style.overflowX === 'scroll' ||
                  parent.classList.contains('no-scrollbar')
                ) {
                  return true;
                }
                parent = parent.parentElement;
              }
              return false;
            };

            elements.forEach((el) => {
              if (isInsideHorizontalScroll(el)) return;

              const rect = el.getBoundingClientRect();
              if (rect.width === 0 || rect.height === 0) return;
              if (rect.top > window.innerHeight || rect.bottom < 0) return;

              if (rect.left < 14.0) {
                errors.push(
                  `<${el.tagName.toLowerCase()} class="${el.className}"> left is ${rect.left.toFixed(1)}px (< 16px)`
                );
              }
              if (rect.right > vpWidth - 14.0) {
                errors.push(
                  `<${el.tagName.toLowerCase()} class="${el.className}"> right is ${rect.right.toFixed(1)}px (> ${vpWidth - 16}px)`
                );
              }
            });

            return errors;
          }, vp.width);

          expect(
            alignmentCheck,
            `Elements should respect layout gutters at ${vp.name}: \n${alignmentCheck.join('\n')}`
          ).toEqual([]);

          // 4. Assert no text clipping inside badge chips
          const chipClippingErrors = await page.evaluate(() => {
            const errors: string[] = [];
            const chips = document.querySelectorAll('[data-chip]');
            chips.forEach((chip) => {
              if (chip.scrollWidth > chip.clientWidth + 2) {
                errors.push(
                  `Chip "${chip.textContent?.trim()}" has scrollWidth (${chip.scrollWidth}) > clientWidth (${chip.clientWidth})`
                );
              }
            });
            return errors;
          });

          expect(
            chipClippingErrors,
            `Chips should not clip their text at ${vp.name}: \n${chipClippingErrors.join('\n')}`
          ).toEqual([]);

          // 5. Save screenshot to e2e/screenshots/
          const screenshotPath = path.join(
            process.cwd(),
            'e2e',
            'screenshots',
            `${tab.name}-${vp.name}.png`
          );
          await page.screenshot({ path: screenshotPath, fullPage: false });
        });
      }
    });
  }
});
