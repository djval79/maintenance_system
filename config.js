export const config = {
    // ===== CLIENT CONFIGURATION =====
    clients: [
        {
            id: "novum_care",
            name: "Novum Care Group",
            tier: "Premium",
            email: "admin@novumcare.example.com"
        },
        {
            id: "abner_health",
            name: "Abner Health Services",
            tier: "Standard",
            email: "contact@abnerhealth.example.com"
        }
    ],

    // ===== TARGET SITES =====
    targets: [
        {
            name: "ComplyFlow",
            url: "https://comply-flow.vercel.app",
            id: "complyflow",
            clientId: "novum_care",
            type: "Compliance Portal"
        },
        {
            name: "NovumFlow",
            url: "https://hr-recruitment-platform.vercel.app/login",
            id: "novumflow",
            clientId: "novum_care",
            type: "HR Recruitment"
        },
        {
            name: "CareFlow AI",
            url: "https://careflow-ai.vercel.app",
            id: "careflow",
            clientId: "novum_care",
            type: "Operation Dashboard"
        },
        {
            name: "Abner Care",
            url: "https://abnercare.co.uk/",
            id: "abnercare",
            clientId: "abner_health",
            type: "Public Website"
        }
    ],

    // ===== AUDIT SETTINGS =====
    audit: {
        logLevel: 'info',
        outputFormat: 'html',
        reportDir: './reports',
        thresholds: {
            performance: 90,
            accessibility: 90,
            bestPractices: 80,
            seo: 90
        }
    },

    // ===== SCHEDULER SETTINGS =====
    scheduler: {
        enabled: true,
        // Cron expressions for scheduled scans
        dailyUptimeCheck: '0 */4 * * *',      // Every 4 hours
        weeklyFullAudit: '0 3 * * 1',          // Monday at 3 AM
        monthlyDeepScan: '0 2 1 * *',          // 1st of month at 2 AM
        timezone: 'Europe/London'
    },

    // ===== EMAIL ALERT SETTINGS =====
    email: {
        enabled: false,  // Set to true and configure SMTP to enable
        smtp: {
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: false,
            auth: {
                user: process.env.SMTP_USER || '',
                pass: process.env.SMTP_PASS || ''
            }
        },
        from: process.env.EMAIL_FROM || 'maintenance@yourdomain.com',
        adminEmail: process.env.ADMIN_EMAIL || 'admin@yourdomain.com',
        alerts: {
            onDowntime: true,
            onScoreDrop: true,
            onNewPainPoints: true,
            dailyDigest: true
        }
    },

    // ===== AUTHENTICATION SETTINGS =====
    auth: {
        enabled: true,
        users: [
            {
                username: 'admin',
                // Default password: 'maintenance123' (bcrypt hash)
                passwordHash: '$2a$10$xVWsK8YXq3mZ7hKlHvGZ8.JwXkPqE5r8YdF1nM2I3g4H5j6K7L8M9',
                role: 'admin'
            },
            {
                username: 'viewer',
                // Default password: 'view123'
                passwordHash: '$2a$10$aB1cD2eF3gH4iJ5kL6mN7oP8qR9sT0uV1wX2yZ3aB4cD5eF6gH7iJ',
                role: 'viewer'
            }
        ],
        sessionSecret: process.env.SESSION_SECRET || 'maintenance-os-secret-key-change-in-production',
        sessionMaxAge: 24 * 60 * 60 * 1000  // 24 hours
    },

    // ===== REVENUE ANALYTICS =====
    revenue: {
        // Estimated value per pain point type (in GBP)
        painPointValues: {
            "Speed Optimization Service": { min: 500, max: 1500, priority: 'high' },
            "Accessibility Remediation": { min: 800, max: 2500, priority: 'critical' },
            "SEO Audit & Fix": { min: 400, max: 1200, priority: 'medium' },
            "Hosting Migration/Stability Upgrade": { min: 1000, max: 3000, priority: 'high' },
            "Security Hardening": { min: 1500, max: 5000, priority: 'critical' },
            "Mobile Optimization": { min: 600, max: 1800, priority: 'medium' }
        },
        // Monthly retainer values by tier
        tierValues: {
            "Standard": { monthly: 199, annual: 1990 },
            "Premium": { monthly: 699, annual: 6990 },
            "Enterprise": { monthly: 1500, annual: 15000 }
        }
    },

    // ===== UI SETTINGS =====
    ui: {
        defaultTheme: 'dark',
        companyName: 'Maintenance OS',
        companyTagline: 'Proactive Performance Guarding',
        showDemoMode: true
    }
};

