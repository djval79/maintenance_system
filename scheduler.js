import cron from 'node-cron';
import { config } from './config.js';
import { runAudit } from './engine.js';
import { sendAlertEmail, sendDigestEmail } from './email.js';

// Store audit history for trend analysis
const auditHistory = [];

// ===== UPTIME CHECK (Lightweight) =====
async function runUptimeCheck() {
    console.log('\n⏰ [SCHEDULER] Running scheduled uptime check...');
    const timestamp = new Date().toISOString();
    const results = [];

    for (const target of config.targets) {
        try {
            const start = Date.now();
            const response = await fetch(target.url, { method: 'HEAD', timeout: 10000 });
            const latency = Date.now() - start;
            const status = (response.ok || response.status < 500) ? 'UP' : 'DOWN';

            results.push({
                targetId: target.id,
                name: target.name,
                status,
                statusCode: response.status,
                latency: `${latency}ms`,
                timestamp
            });

            if (status === 'DOWN' && config.email.enabled && config.email.alerts.onDowntime) {
                await sendAlertEmail({
                    type: 'downtime',
                    target,
                    details: { statusCode: response.status, latency }
                });
            }

            console.log(`  📡 ${target.name}: ${status} (${latency}ms)`);
        } catch (error) {
            results.push({
                targetId: target.id,
                name: target.name,
                status: 'DOWN',
                error: error.message,
                timestamp
            });

            if (config.email.enabled && config.email.alerts.onDowntime) {
                await sendAlertEmail({
                    type: 'downtime',
                    target,
                    details: { error: error.message }
                });
            }

            console.log(`  ❌ ${target.name}: DOWN (${error.message})`);
        }
    }

    console.log(`✅ [SCHEDULER] Uptime check complete at ${timestamp}\n`);
    return results;
}

// ===== FULL AUDIT (Comprehensive) =====
async function runFullAudit() {
    console.log('\n🔍 [SCHEDULER] Running scheduled full audit...');
    const timestamp = new Date().toISOString();
    const results = [];
    const newPainPoints = [];

    for (const target of config.targets) {
        try {
            const result = await runAudit(target, config.audit);
            results.push(result);

            // Track new pain points
            if (result.opportunities && result.opportunities.length > 0) {
                newPainPoints.push({
                    target: target.name,
                    opportunities: result.opportunities
                });
            }

            // Store in history for trends
            auditHistory.push({
                targetId: target.id,
                timestamp: Date.now(),
                scores: result.scores,
                uptime: result.uptime
            });

            // Keep only last 100 entries per target
            const targetHistory = auditHistory.filter(h => h.targetId === target.id);
            if (targetHistory.length > 100) {
                const oldestIndex = auditHistory.findIndex(h => h.targetId === target.id);
                auditHistory.splice(oldestIndex, 1);
            }

        } catch (error) {
            console.error(`  ❌ Audit failed for ${target.name}:`, error.message);
            results.push({ success: false, target: target.name, error: error.message });
        }
    }

    // Send email alerts for new pain points
    if (newPainPoints.length > 0 && config.email.enabled && config.email.alerts.onNewPainPoints) {
        await sendAlertEmail({
            type: 'painpoints',
            details: newPainPoints
        });
    }

    console.log(`✅ [SCHEDULER] Full audit complete at ${timestamp}\n`);
    return results;
}

// ===== DAILY DIGEST =====
async function sendDailyDigest() {
    if (!config.email.enabled || !config.email.alerts.dailyDigest) return;

    console.log('\n📧 [SCHEDULER] Sending daily digest...');

    const last24h = Date.now() - (24 * 60 * 60 * 1000);
    const recentAudits = auditHistory.filter(h => h.timestamp > last24h);

    await sendDigestEmail(recentAudits);
    console.log('✅ [SCHEDULER] Daily digest sent\n');
}

// ===== EXPORT HISTORY FOR DASHBOARD =====
export function getAuditHistory() {
    return auditHistory;
}

// ===== SCHEDULER INITIALIZATION =====
export function initScheduler() {
    if (!config.scheduler.enabled) {
        console.log('⚠️ [SCHEDULER] Scheduler is disabled in config');
        return;
    }

    console.log('\n🚀 [SCHEDULER] Initializing scheduled tasks...');
    console.log(`   Timezone: ${config.scheduler.timezone}`);

    // Uptime checks (every 4 hours by default)
    cron.schedule(config.scheduler.dailyUptimeCheck, runUptimeCheck, {
        timezone: config.scheduler.timezone
    });
    console.log(`   ✅ Uptime Check: ${config.scheduler.dailyUptimeCheck}`);

    // Weekly full audit (Monday 3 AM by default)
    cron.schedule(config.scheduler.weeklyFullAudit, runFullAudit, {
        timezone: config.scheduler.timezone
    });
    console.log(`   ✅ Weekly Audit: ${config.scheduler.weeklyFullAudit}`);

    // Monthly deep scan (1st of month at 2 AM)
    cron.schedule(config.scheduler.monthlyDeepScan, async () => {
        console.log('\n🔬 [SCHEDULER] Running monthly deep scan...');
        await runFullAudit();
        await sendDailyDigest();
    }, {
        timezone: config.scheduler.timezone
    });
    console.log(`   ✅ Monthly Deep Scan: ${config.scheduler.monthlyDeepScan}`);

    // Daily digest (9 AM daily)
    cron.schedule('0 9 * * *', sendDailyDigest, {
        timezone: config.scheduler.timezone
    });
    console.log(`   ✅ Daily Digest: 0 9 * * * (9 AM)`);

    console.log('\n🎯 [SCHEDULER] All tasks scheduled successfully!\n');
}

// ===== MANUAL TRIGGERS (for API) =====
export { runUptimeCheck, runFullAudit, sendDailyDigest };

// ===== STANDALONE EXECUTION =====
if (import.meta.url === `file://${process.argv[1]}`) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  MAINTENANCE OS SCHEDULER');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    initScheduler();

    // Run initial uptime check on startup
    console.log('\n🚀 Running initial uptime check...');
    runUptimeCheck().then(() => {
        console.log('📋 Scheduler is now running. Press Ctrl+C to stop.\n');
    });
}
