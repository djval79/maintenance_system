import nodemailer from 'nodemailer';
import { config } from './config.js';

// ===== CREATE TRANSPORTER =====
let transporter = null;

function getTransporter() {
    if (!transporter && config.email.enabled) {
        transporter = nodemailer.createTransport(config.email.smtp);
    }
    return transporter;
}

// ===== EMAIL TEMPLATES =====
const templates = {
    downtime: (data) => ({
        subject: `🚨 ALERT: ${data.target.name} is DOWN`,
        html: `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f8fafc; padding: 40px; border-radius: 16px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #ef4444; margin: 0;">🚨 Downtime Alert</h1>
                </div>
                
                <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                    <h2 style="margin: 0 0 10px 0; color: #f8fafc;">${data.target.name}</h2>
                    <p style="margin: 0; color: #94a3b8;">${data.target.url}</p>
                </div>
                
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #1e293b; color: #94a3b8;">Status</td>
                        <td style="padding: 10px 0; border-bottom: 1px solid #1e293b; color: #ef4444; font-weight: bold;">DOWN</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #1e293b; color: #94a3b8;">Status Code</td>
                        <td style="padding: 10px 0; border-bottom: 1px solid #1e293b;">${data.details.statusCode || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #1e293b; color: #94a3b8;">Error</td>
                        <td style="padding: 10px 0; border-bottom: 1px solid #1e293b;">${data.details.error || 'Connection failed'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; color: #94a3b8;">Detected At</td>
                        <td style="padding: 10px 0;">${new Date().toLocaleString('en-GB')}</td>
                    </tr>
                </table>
                
                <div style="margin-top: 30px; text-align: center;">
                    <a href="${data.target.url}" style="background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Check Site</a>
                </div>
                
                <p style="margin-top: 40px; font-size: 12px; color: #64748b; text-align: center;">
                    Maintenance OS | Automated Alert System
                </p>
            </div>
        `
    }),

    painpoints: (data) => ({
        subject: `💰 New Revenue Opportunities Detected (${data.details.length} sites)`,
        html: `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f8fafc; padding: 40px; border-radius: 16px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #f59e0b; margin: 0;">💰 New Opportunities</h1>
                    <p style="color: #94a3b8;">Pain points detected during latest scan</p>
                </div>
                
                ${data.details.map(site => `
                    <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 12px; padding: 20px; margin-bottom: 16px;">
                        <h3 style="margin: 0 0 12px 0; color: #f8fafc;">${site.target}</h3>
                        <ul style="margin: 0; padding-left: 20px; color: #94a3b8;">
                            ${site.opportunities.map(opp => `<li style="margin-bottom: 6px;">${opp}</li>`).join('')}
                        </ul>
                    </div>
                `).join('')}
                
                <div style="margin-top: 30px; text-align: center;">
                    <a href="http://localhost:3030" style="background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">View Dashboard</a>
                </div>
                
                <p style="margin-top: 40px; font-size: 12px; color: #64748b; text-align: center;">
                    Maintenance OS | Revenue Intelligence
                </p>
            </div>
        `
    }),

    scoreDrop: (data) => ({
        subject: `⚠️ Performance Drop: ${data.target.name}`,
        html: `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f8fafc; padding: 40px; border-radius: 16px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #f59e0b; margin: 0;">⚠️ Score Drop Detected</h1>
                </div>
                
                <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                    <h2 style="margin: 0 0 10px 0; color: #f8fafc;">${data.target.name}</h2>
                    <p style="margin: 0; color: #94a3b8;">${data.target.url}</p>
                </div>
                
                <div style="display: flex; gap: 16px; margin-bottom: 20px;">
                    <div style="flex: 1; background: #1e293b; padding: 16px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 24px; font-weight: bold; color: #ef4444;">${data.details.previous}</div>
                        <div style="font-size: 12px; color: #94a3b8;">Previous</div>
                    </div>
                    <div style="flex: 1; background: #1e293b; padding: 16px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 24px; font-weight: bold; color: #f59e0b;">${data.details.current}</div>
                        <div style="font-size: 12px; color: #94a3b8;">Current</div>
                    </div>
                    <div style="flex: 1; background: #1e293b; padding: 16px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 24px; font-weight: bold; color: #ef4444;">-${data.details.drop}</div>
                        <div style="font-size: 12px; color: #94a3b8;">Change</div>
                    </div>
                </div>
                
                <p style="margin-top: 40px; font-size: 12px; color: #64748b; text-align: center;">
                    Maintenance OS | Performance Monitor
                </p>
            </div>
        `
    }),

    digest: (data) => ({
        subject: `📊 Daily Maintenance Digest - ${new Date().toLocaleDateString('en-GB')}`,
        html: `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f8fafc; padding: 40px; border-radius: 16px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #6366f1; margin: 0;">📊 Daily Digest</h1>
                    <p style="color: #94a3b8;">${new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                
                <div style="background: #1e293b; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                    <h3 style="margin: 0 0 16px 0; color: #f8fafc;">Summary</h3>
                    <table style="width: 100%;">
                        <tr>
                            <td style="padding: 8px 0; color: #94a3b8;">Sites Monitored</td>
                            <td style="padding: 8px 0; text-align: right; font-weight: bold;">${data.sitesMonitored}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #94a3b8;">Audits Performed</td>
                            <td style="padding: 8px 0; text-align: right; font-weight: bold;">${data.auditsPerformed}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #94a3b8;">Avg Performance</td>
                            <td style="padding: 8px 0; text-align: right; font-weight: bold; color: ${data.avgPerformance >= 90 ? '#10b981' : '#f59e0b'};">${data.avgPerformance}%</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #94a3b8;">Issues Detected</td>
                            <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #ef4444;">${data.issuesDetected}</td>
                        </tr>
                    </table>
                </div>
                
                <div style="text-align: center;">
                    <a href="http://localhost:3030" style="background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Open Dashboard</a>
                </div>
                
                <p style="margin-top: 40px; font-size: 12px; color: #64748b; text-align: center;">
                    Maintenance OS | Daily Report
                </p>
            </div>
        `
    })
};

// ===== SEND ALERT EMAIL =====
export async function sendAlertEmail(data) {
    if (!config.email.enabled) {
        console.log('📧 [EMAIL] Email disabled - would have sent:', data.type);
        return { success: false, reason: 'Email disabled' };
    }

    const transport = getTransporter();
    if (!transport) {
        console.error('📧 [EMAIL] Transporter not configured');
        return { success: false, reason: 'Transporter not configured' };
    }

    try {
        const template = templates[data.type];
        if (!template) {
            throw new Error(`Unknown email template: ${data.type}`);
        }

        const emailContent = template(data);

        await transport.sendMail({
            from: config.email.from,
            to: config.email.adminEmail,
            subject: emailContent.subject,
            html: emailContent.html
        });

        console.log(`📧 [EMAIL] Sent ${data.type} alert successfully`);
        return { success: true };

    } catch (error) {
        console.error(`📧 [EMAIL] Failed to send ${data.type} alert:`, error.message);
        return { success: false, error: error.message };
    }
}

// ===== SEND DIGEST EMAIL =====
export async function sendDigestEmail(recentAudits) {
    if (!config.email.enabled) {
        console.log('📧 [EMAIL] Email disabled - would have sent digest');
        return { success: false, reason: 'Email disabled' };
    }

    const transport = getTransporter();
    if (!transport) return { success: false, reason: 'Transporter not configured' };

    try {
        // Calculate digest stats
        const sitesMonitored = config.targets.length;
        const auditsPerformed = recentAudits.length;
        const avgPerformance = auditsPerformed > 0
            ? Math.round(recentAudits.reduce((sum, a) => sum + (a.scores?.performance || 0), 0) / auditsPerformed)
            : 0;
        const issuesDetected = recentAudits.filter(a => a.uptime?.status === 'DOWN').length;

        const emailContent = templates.digest({
            sitesMonitored,
            auditsPerformed,
            avgPerformance,
            issuesDetected
        });

        await transport.sendMail({
            from: config.email.from,
            to: config.email.adminEmail,
            subject: emailContent.subject,
            html: emailContent.html
        });

        console.log('📧 [EMAIL] Sent daily digest successfully');
        return { success: true };

    } catch (error) {
        console.error('📧 [EMAIL] Failed to send digest:', error.message);
        return { success: false, error: error.message };
    }
}

// ===== VERIFY EMAIL CONFIG =====
export async function verifyEmailConfig() {
    if (!config.email.enabled) {
        return { success: false, reason: 'Email disabled in config' };
    }

    const transport = getTransporter();
    if (!transport) {
        return { success: false, reason: 'Transporter not configured' };
    }

    try {
        await transport.verify();
        console.log('📧 [EMAIL] SMTP connection verified successfully');
        return { success: true };
    } catch (error) {
        console.error('📧 [EMAIL] SMTP verification failed:', error.message);
        return { success: false, error: error.message };
    }
}
