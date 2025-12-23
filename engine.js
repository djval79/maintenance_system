import puppeteer from 'puppeteer';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function checkUptime(url) {
    try {
        const start = Date.now();
        const response = await fetch(url, { method: 'HEAD', timeout: 5000 });
        const latency = Date.now() - start;
        return {
            status: (response.ok || response.status < 500) ? 'UP' : 'DOWN',
            statusCode: response.status,
            latency: `${latency}ms`
        };
    } catch (error) {
        return { status: 'DOWN', statusCode: 500, error: error.message };
    }
}

export async function runAudit(target, options) {
    console.log(`\n🚀 Starting maintenance audit for: ${target.name} (${target.url})`);

    const uptime = await checkUptime(target.url);
    console.log(`📡 Uptime: ${uptime.status}`);

    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
        let chrome;
        let browser;
        try {
            attempts++;
            // 1. Launch Chrome via Launcher
            chrome = await chromeLauncher.launch({
                chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
            });

            // 2. Connect Puppeteer for Snapshot
            browser = await puppeteer.connect({
                browserURL: `http://127.0.0.1:${chrome.port}`
            });

            const page = await browser.newPage();
            await page.goto(target.url, { waitUntil: 'networkidle2', timeout: 30000 });

            const timestamp = Date.now();
            const screenshotDir = path.resolve(__dirname, options.reportDir || './reports', 'screenshots');
            if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

            const screenshotName = `${target.id}-${timestamp}.png`;
            const screenshotPath = path.join(screenshotDir, screenshotName);
            await page.screenshot({ path: screenshotPath });

            // 3. Lighthouse Audit
            console.log(`📊 Generating Lighthouse report (Attempt ${attempts})...`);
            const lighthouseOptions = {
                logLevel: 'error',
                output: options.outputFormat || 'html',
                onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
                port: chrome.port,
                disableStorageReset: true,
                formFactor: 'desktop',
                screenEmulation: { disabled: true },
                throttlingMethod: 'simulate'
            };

            const runnerResult = await lighthouse(target.url, lighthouseOptions);

            // 4. Extract Stats
            const scores = {
                performance: runnerResult.lhr.categories.performance.score * 100,
                accessibility: runnerResult.lhr.categories.accessibility.score * 100,
                bestPractices: runnerResult.lhr.categories['best-practices'].score * 100,
                seo: runnerResult.lhr.categories.seo.score * 100
            };

            const opportunities = [];
            if (scores.performance < (options.thresholds?.performance || 90)) opportunities.push("Speed Optimization Service");
            if (scores.accessibility < (options.thresholds?.accessibility || 90)) opportunities.push("Accessibility Remediation");
            if (scores.seo < (options.thresholds?.seo || 90)) opportunities.push("SEO Audit & Fix");

            const stats = {
                targetId: target.id,
                clientId: target.clientId,
                timestamp,
                scores,
                uptime,
                opportunities,
                screenshot: `/reports/screenshots/${screenshotName}`
            };

            const fileName = `${target.id}-${timestamp}.${options.outputFormat}`;
            const reportDir = path.resolve(__dirname, options.reportDir || './reports');
            const filePath = path.join(reportDir, fileName);

            const augmentedHtml = runnerResult.report + `\n<!-- MAINTENANCE_METADATA:${JSON.stringify(stats)} -->`;
            fs.writeFileSync(filePath, augmentedHtml);

            console.log(`✅ Audit complete for ${target.name} [Score: ${scores.performance.toFixed(0)}]`);

            return { success: true, target: target.name, ...stats };

        } catch (error) {
            console.error(`❌ Audit Attempt ${attempts} failed for ${target.name}:`, error.message);
            if (attempts >= maxAttempts) {
                return { success: false, target: target.name, error: error.message };
            }
            // Small delay before retry
            await new Promise(resolve => setTimeout(resolve, 2000));
        } finally {
            if (browser) await browser.disconnect();
            if (chrome) await chrome.kill();
        }
    }
}
