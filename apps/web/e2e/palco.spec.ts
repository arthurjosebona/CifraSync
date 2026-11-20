import { expect, test, type Page } from '@playwright/test';

/** Cifra longa o bastante para ocupar várias páginas numa janela de 900×600. */
function longSong(prefix: string): string {
  const parts: string[] = [];
  for (let i = 1; i <= 14; i++) {
    parts.push('G          D/F#       Em', `${prefix} linha ${i} da canção de teste`);
    if (i % 4 === 0) parts.push('', '[Refrão]');
  }
  return parts.join('\n');
}

async function createSong(page: Page, title: string, content: string): Promise<string> {
  await page.goto('/musicas/nova');
  await page.getByLabel('Título').fill(title);
  await page.getByLabel('Tom', { exact: true }).fill('G');
  const editor = page.locator('.cm-content');
  await editor.click();
  await page.keyboard.insertText(content);
  await page.getByRole('button', { name: 'Salvar' }).click();
  await page.waitForURL(/\/musicas\/[0-9a-f-]+$/);
  return page.url().split('/').pop()!;
}

test('paginação por toque e teclado', async ({ page }) => {
  const id = await createSong(page, 'Paginada', longSong('Primeira'));
  await page.goto(`/palco/musica/${id}`);
  const counter = page.locator('header').getByText(/^1\/\d+$/);
  await expect(counter).toBeVisible();

  // espera as fontes e a medição da página antes de tocar
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  const pageArea = page.locator('.stage .flex.h-full').last();
  const box = (await pageArea.boundingBox())!;
  const tap = (fx: number) =>
    pageArea.click({ position: { x: box.width * fx, y: box.height / 2 } });

  await tap(0.9);
  await expect(page.locator('header').getByText(/^2\/\d+$/)).toBeVisible();

  await page.waitForTimeout(400); // proteção contra toque duplo
  await tap(0.1);
  await expect(page.locator('header').getByText(/^1\/\d+$/)).toBeVisible();

  await page.keyboard.press('ArrowRight');
  await expect(page.locator('header').getByText(/^2\/\d+$/)).toBeVisible();
});

test('nenhuma página começa com letra separada da sua cifra', async ({ page }) => {
  const id = await createSong(page, 'Sem cortes', longSong('Segunda'));
  await page.goto(`/palco/musica/${id}`);
  const total = Number(
    (await page
      .locator('header')
      .getByText(/^1\/\d+$/)
      .textContent())!.split('/')[1],
  );
  for (let p = 0; p < total; p++) {
    const firstLines = page.locator('.stage .flex.h-full > .song > :first-child');
    const count = await firstLines.count();
    for (let i = 0; i < count; i++) {
      const el = firstLines.nth(i);
      const text = (await el.textContent()) ?? '';
      if (text.includes('linha')) await expect(el.locator('.song-pair')).toHaveCount(1);
    }
    await page.keyboard.press('ArrowRight');
  }
});

test('transposição ao vivo no palco', async ({ page }) => {
  const id = await createSong(page, 'Transpor', 'G   C   D\nla la la');
  await page.goto(`/palco/musica/${id}`);
  await expect(page.locator('header').getByText('G', { exact: true })).toBeVisible();
  await page.keyboard.press('+');
  await page.keyboard.press('+');
  await expect(page.locator('header').getByText('A (+2)')).toBeVisible();
  await expect(page.locator('.stage .song-chord').first()).toHaveText('A');
  await page.keyboard.press('0');
  await expect(page.locator('header').getByText('G', { exact: true })).toBeVisible();
});

test('repertório avança para a próxima música no fim da última página', async ({ page }) => {
  await createSong(page, 'Abertura', 'G   D\nprimeira');
  await createSong(page, 'Encerramento', 'C   G\nsegunda');
  await page.goto('/repertorios');
  await page.getByRole('button', { name: 'Novo' }).click();
  await page.getByLabel('Nome (show, ensaio, evento)').fill('Show de teste');
  await page.getByRole('button', { name: 'Criar' }).click();
  await page.waitForURL(/\/repertorios\/[0-9a-f-]+$/);
  for (const title of ['Abertura', 'Encerramento']) {
    await page.getByPlaceholder('Buscar música na biblioteca').fill(title);
    await page.getByRole('button', { name: new RegExp(title) }).click();
  }
  await page.getByRole('button', { name: 'Tocar' }).click();
  await expect(page.locator('header').getByText('Abertura')).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('header').getByText('Encerramento')).toBeVisible();
  await expect(page.getByText('Fim do repertório')).toBeVisible();
});

test('no modo híbrido, rolar à mão não desliga a rolagem automática', async ({ page }) => {
  const id = await createSong(page, 'Híbrida', longSong('Terceira'));
  await page.goto(`/palco/musica/${id}`);
  // páginas → automática → híbrido
  await page.getByRole('button', { name: /^Modo:/ }).click();
  await page.getByRole('button', { name: /^Modo:/ }).click();
  await expect(page.getByRole('button', { name: 'Modo: híbrido' })).toBeVisible();
  await page.getByRole('button', { name: 'Rolar' }).click();

  const scroller = page.locator('.stage .overflow-y-auto.song');
  await page.waitForTimeout(800);
  await scroller.hover();
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(2000);
  const after = await scroller.evaluate((el) => el.scrollTop);
  await page.waitForTimeout(1000);
  const later = await scroller.evaluate((el) => el.scrollTop);
  expect(later).toBeGreaterThan(after);
});
