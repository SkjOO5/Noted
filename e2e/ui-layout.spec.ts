import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const VIEWPORT_WIDTHS = [360, 390, 480, 768];
const VIEWPORT_HEIGHT = 800;

const TABS = [
  { name: 'messages', label: /Messages/i },
  { name: 'calendar', label: /Calendar/i },
  { name: 'notes', label: /Notes/i },
];

test.describe('UI Layout & Design System Verification', () => {
  test.beforeAll(() => {
    const screenshotDir = path.join(process.cwd(), 'e2e', 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
  });

  for (const width of VIEWPORT_WIDTHS) {
    test.describe(`Viewport: ${width}px`, () => {
      for (const tab of TABS) {
        test(`verifies layout and captures screenshot for ${tab.name} tab at ${width}px`, async ({
          page,
        }) => {
          await page.setViewportSize({ width, height: VIEWPORT_HEIGHT });
          await page.goto('/?demo=1');
          await page.waitForLoadState('networkidle');

          // Switch to the target tab
          const tabButton = page.getByRole('tab', { name: tab.label });
          await tabButton.click();
          await page.waitForTimeout(300); // Allow render and transitions

          // 1. Assert no horizontal page overflow (document.documentElement.scrollWidth === clientWidth)
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
            `Document scrollWidth (${overflow.docScrollWidth}) should not exceed clientWidth (${overflow.docClientWidth}) at ${width}px`
          ).toBeLessThanOrEqual(overflow.docClientWidth + 1);

          // 2. Tab-specific checks for Notes Tab (search input and "+ Note" button have equal height 44px)
          if (tab.name === 'notes') {
            const searchInput = page.locator('input[placeholder="Search notes..."]');
            const addNoteBtn = page.getByRole('button', { name: /\+ Note/i });

            await expect(searchInput).toBeVisible();
            await expect(addNoteBtn).toBeVisible();

            const searchBox = await searchInput.boundingBox();
            const btnBox = await addNoteBtn.boundingBox();

            expect(searchBox).not.toBeNull();
            expect(btnBox).not.toBeNull();

            if (searchBox && btnBox) {
              expect(Math.round(searchBox.height)).toBe(44);
              expect(Math.round(btnBox.height)).toBe(44);
            }
          }

          // 3. Verify horizontal gutter alignment (left >= 16px and right <= width - 16px for visible cards, controls, buttons, chips)
          const alignmentCheck = await page.evaluate((vpWidth) => {
            const errors: string[] = [];
            // Target cards, inputs, buttons, and chips
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

              // Check left gutter (allowing 1.5px sub-pixel tolerance)
              if (rect.left < 14.5) {
                errors.push(
                  `<${el.tagName.toLowerCase()} class="${el.className}"> left is ${rect.left.toFixed(1)}px (< 16px)`
                );
              }
              // Check right gutter (allowing 1.5px sub-pixel tolerance)
              if (rect.right > vpWidth - 14.5) {
                errors.push(
                  `<${el.tagName.toLowerCase()} class="${el.className}"> right is ${rect.right.toFixed(1)}px (> ${vpWidth - 16}px)`
                );
              }
            });

            return errors;
          }, width);

          expect(
            alignmentCheck,
            `Elements should respect layout gutters at ${width}px: \n${alignmentCheck.join('\n')}`
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
            `Chips should not clip their text: \n${chipClippingErrors.join('\n')}`
          ).toEqual([]);

          // 5. Save screenshot to e2e/screenshots/
          const screenshotPath = path.join(
            process.cwd(),
            'e2e',
            'screenshots',
            `${tab.name}-${width}px.png`
          );
          await page.screenshot({ path: screenshotPath, fullPage: false });
        });
      }
    });
  }
});
