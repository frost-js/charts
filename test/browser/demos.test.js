import { expect, test } from '#test';

for (const file of ['bar.html', 'line.html', 'pie.htm']) {
    test(`the original ${file} example works with local dependencies`, async ({ page }, testInfo) => {
        await page.goto(`/demo/${file}`);

        await expect(page.locator('canvas')).toHaveAttribute('height', '500');
        await expect(page.locator('canvas')).toHaveAttribute('aria-label', /Dataset|D1/);

        if (testInfo.project.name === 'chromium') {
            await page.screenshot({ path: `.tmp/demo-${file}.png` });
        }
    });
}
