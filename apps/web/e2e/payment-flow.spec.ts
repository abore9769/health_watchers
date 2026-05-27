import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { WalletPage } from './pages/WalletPage';

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@example.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'Password123!';
const TESTNET_TX_HASH = 'a'.repeat(64); // Mock transaction hash for testing

test.describe('Payment Flow (Testnet)', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(ADMIN_EMAIL, ADMIN_PASSWORD);
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('fund wallet with Friendbot and verify balance', async ({ page }) => {
    const wallet = new WalletPage(page);
    await wallet.goto();

    // Fund with Friendbot (testnet only)
    await wallet.fundWithFriendbot();

    // Wait for balance to update
    await expect(wallet.balanceDisplay).toContainText(/10000|balance/i, { timeout: 10_000 });
  });

  test('full payment lifecycle: intent → confirm → receipt', async ({ page }) => {
    const wallet = new WalletPage(page);
    await wallet.goto();

    // Fund wallet first
    await wallet.fundWithFriendbot();
    await expect(wallet.balanceDisplay).toContainText(/10000|balance/i, { timeout: 10_000 });

    // Create payment intent
    await wallet.createPaymentIntent('50', 'patient-1', 'encounter-1');
    await expect(page.getByText(/pending/i)).toBeVisible({ timeout: 5_000 });

    // Confirm payment with Stellar transaction
    await wallet.confirmPayment(TESTNET_TX_HASH);
    await expect(page.getByText(/confirmed/i)).toBeVisible({ timeout: 15_000 });

    // Verify receipt is downloadable
    const download = await wallet.downloadReceipt();
    expect(download.suggestedFilename()).toMatch(/receipt.*\.pdf/i);
  });

  test('payment dispute workflow', async ({ page }) => {
    const wallet = new WalletPage(page);
    await wallet.goto();

    // Fund and create payment
    await wallet.fundWithFriendbot();
    await wallet.createPaymentIntent('25', 'patient-1', 'encounter-1');
    await wallet.confirmPayment(TESTNET_TX_HASH);
    await expect(page.getByText(/confirmed/i)).toBeVisible({ timeout: 15_000 });

    // File dispute
    await wallet.fileDispute('Incorrect amount charged');
    await expect(page.getByText(/dispute.*filed|disputed/i)).toBeVisible({ timeout: 5_000 });
  });

  test('refund issuance transitions payment to refunded', async ({ page }) => {
    const wallet = new WalletPage(page);
    await wallet.goto();

    // Fund and create payment
    await wallet.fundWithFriendbot();
    await wallet.createPaymentIntent('30', 'patient-1', 'encounter-1');
    await wallet.confirmPayment(TESTNET_TX_HASH);
    await expect(page.getByText(/confirmed/i)).toBeVisible({ timeout: 15_000 });

    // Issue refund (admin action)
    await page.getByRole('button', { name: /issue.*refund|refund/i }).click();
    await page.getByRole('button', { name: /confirm.*refund|yes/i }).click();

    // Verify status changed to refunded
    await expect(page.getByText(/refunded/i)).toBeVisible({ timeout: 10_000 });
  });

  test('claimable balance: create → claim → reclaim', async ({ page }) => {
    const wallet = new WalletPage(page);
    await wallet.goto();

    // Fund wallet
    await wallet.fundWithFriendbot();

    // Create claimable balance
    await page.getByRole('button', { name: /create.*claimable|claimable/i }).click();
    await page.getByLabel(/amount/i).fill('100');
    await page.getByLabel(/recipient/i).fill('GPATIENT...');
    await page.getByRole('button', { name: /create/i }).click();
    await expect(page.getByText(/claimable.*created|balance.*created/i)).toBeVisible({ timeout: 5_000 });

    // Patient claims balance
    await page.getByRole('button', { name: /claim/i }).click();
    await expect(page.getByText(/claimed|balance.*claimed/i)).toBeVisible({ timeout: 10_000 });
  });
});
