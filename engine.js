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

    try {
        const timestamp = Date.now();

        // Use Google PageSpeed Insights API
        const categories = ['performance', 'accessibility', 'best-practices', 'seo'];
        const strategy = 'desktop';
        const apiKey = process.env.GOOGLE_API_KEY || ''; // Optional: Add key if available for higher limits

        let apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(target.url)}&strategy=${strategy}`;
        categories.forEach(cat => apiUrl += `&category=${cat}`);
        if (apiKey) apiUrl += `&key=${apiKey}`;

        console.log(`📊 Requesting PageSpeed Insights...`);
        const response = await fetch(apiUrl);

        if (!response.ok) {
            throw new Error(`PSI API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const lhr = data.lighthouseResult;

        // Extract Stats
        const scores = {
            performance: (lhr.categories.performance?.score || 0) * 100,
            accessibility: (lhr.categories.accessibility?.score || 0) * 100,
            bestPractices: (lhr.categories['best-practices']?.score || 0) * 100,
            seo: (lhr.categories.seo?.score || 0) * 100
        };

        const opportunities = [];
        if (scores.performance < (options.thresholds?.performance || 90)) opportunities.push("Speed Optimization Service");
        if (scores.accessibility < (options.thresholds?.accessibility || 90)) opportunities.push("Accessibility Remediation");
        if (scores.seo < (options.thresholds?.seo || 90)) opportunities.push("SEO Audit & Fix");

        // Extract Screenshot (Base64)
        let screenshotPath = '';
        const screenshotData = lhr.audits['final-screenshot']?.details?.data;
        if (screenshotData && !process.env.VERCEL) {
            // Only save to disk if not on Vercel (read-only FS) or use /tmp
            try {
                const screenshotDir = path.resolve(__dirname, options.reportDir || './reports', 'screenshots');
                if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

                const screenshotName = `${target.id}-${timestamp}.jpg`;
                const buffer = Buffer.from(screenshotData.replace(/^data:image\/jpeg;base64,/, ""), 'base64');
                fs.writeFileSync(path.join(screenshotDir, screenshotName), buffer);
                screenshotPath = `/reports/screenshots/${screenshotName}`;
            } catch (e) {
                console.error('Failed to save screenshot:', e.message);
            }
        }

        const stats = {
            targetId: target.id,
            clientId: target.clientId,
            timestamp,
            scores,
            uptime,
            opportunities,
            screenshot: screenshotPath
        };

        // Save Report HTML (Optional, if FS is writable or for local dev)
        // Note: PSI API doesn't return full HTML report directly, only JSON. 
        // We will skip saving the full HTML report on Vercel to avoid IO issues.
        // For local, we could construct a basic JSON dump or partial report.

        console.log(`✅ Audit complete for ${target.name} [Score: ${scores.performance.toFixed(0)}]`);

        return { success: true, target: target.name, ...stats };

    } catch (error) {
        console.error(`❌ Audit failed for ${target.name}:`, error.message);
        return { success: false, target: target.name, error: error.message };
    }
}
