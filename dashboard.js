import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { runAudit } from './engine.js';
import { initScheduler, runUptimeCheck, runFullAudit, getAuditHistory } from './scheduler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3030;
const REPORTS_DIR = path.join(__dirname, 'reports');
const DATA_FILE = path.join(__dirname, 'data.json');

// Session store (simple in-memory for demo)
const sessions = new Map();

// Dynamic data store
function loadDynamicData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        }
    } catch (e) { console.error('Error loading data.json:', e); }
    return { clients: [], targets: [] };
}

function saveDynamicData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function getAllTargets() {
    const dynamic = loadDynamicData();
    return [...config.targets, ...dynamic.targets];
}

function getAllClients() {
    const dynamic = loadDynamicData();
    return [...config.clients, ...dynamic.clients];
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/reports', express.static(REPORTS_DIR));

// ===== HELPER FUNCTIONS =====
function getAllAuditData() {
    if (!fs.existsSync(REPORTS_DIR)) return [];
    const files = fs.readdirSync(REPORTS_DIR).filter(f => f.endsWith('.html'));
    return files.map(f => {
        const content = fs.readFileSync(path.join(REPORTS_DIR, f), 'utf8');
        const match = content.match(/<!-- MAINTENANCE_METADATA:(.*) -->/);
        return match ? { ...JSON.parse(match[1]), filename: f } : null;
    }).filter(d => d !== null).sort((a, b) => b.timestamp - a.timestamp);
}

function getLatestReports() {
    const allData = getAllAuditData();
    const latest = {};
    allData.forEach(d => {
        if (!latest[d.targetId] || latest[d.targetId].timestamp < d.timestamp) {
            latest[d.targetId] = d;
        }
    });
    return Object.values(latest);
}

function calculateRevenue(opportunities) {
    let total = { min: 0, max: 0 };
    opportunities.forEach(opp => {
        const value = config.revenue.painPointValues[opp];
        if (value) {
            total.min += value.min;
            total.max += value.max;
        }
    });
    return total;
}

// ===== ENHANCED ANALYSIS ENGINE =====
function analyzeMetrics(scores, historicalData = []) {
    const analysis = {
        overall: 'good',
        overallScore: 0,
        overallGrade: 'A',
        metrics: {},
        criticalIssues: [],
        warnings: [],
        strengths: [],
        insights: [],
        trendAnalysis: {},
        industryBenchmarks: {},
        executiveSummary: '',
        riskScore: 0,
        opportunityScore: 0
    };

    // Enhanced thresholds with industry benchmarks
    const thresholds = {
        performance: {
            critical: 50, warning: 75, good: 90,
            industry: { average: 65, top25: 85, top10: 95 },
            weight: 0.35  // Performance is most impactful
        },
        accessibility: {
            critical: 60, warning: 80, good: 90,
            industry: { average: 72, top25: 88, top10: 96 },
            weight: 0.25  // Legal/compliance importance
        },
        seo: {
            critical: 50, warning: 75, good: 90,
            industry: { average: 68, top25: 82, top10: 92 },
            weight: 0.25  // Revenue impact
        },
        bestPractices: {
            critical: 50, warning: 70, good: 85,
            industry: { average: 70, top25: 85, top10: 92 },
            weight: 0.15  // Technical hygiene
        }
    };

    const metricLabels = {
        performance: 'Performance',
        accessibility: 'Accessibility',
        seo: 'SEO',
        bestPractices: 'Best Practices'
    };

    const metricDescriptions = {
        performance: 'Page load speed, interactivity, and visual stability',
        accessibility: 'Usability for people with disabilities and assistive technologies',
        seo: 'Search engine visibility and organic traffic potential',
        bestPractices: 'Modern web standards, security, and reliability'
    };

    const metricImpacts = {
        performance: {
            business: 'Every 1-second delay reduces conversions by 7%',
            user: 'Users expect pages to load in under 3 seconds',
            seo: 'Core Web Vitals directly affect Google rankings'
        },
        accessibility: {
            business: '15-20% of users have some form of disability',
            user: 'Improves usability for all users, not just those with disabilities',
            legal: 'Accessibility lawsuits increased 200%+ in recent years'
        },
        seo: {
            business: 'Organic search drives 53% of all website traffic',
            user: 'Better SEO means users can find your services',
            revenue: 'Top 3 Google results get 75% of all clicks'
        },
        bestPractices: {
            business: 'Reduces maintenance costs and security risks',
            user: 'Modern features and consistent experience',
            security: 'Protects against common vulnerabilities'
        }
    };

    let totalScore = 0;
    let weightedScore = 0;
    let totalWeight = 0;
    let count = 0;

    Object.entries(scores).forEach(([key, value]) => {
        if (thresholds[key]) {
            count++;
            totalScore += value;
            const t = thresholds[key];
            weightedScore += value * t.weight;
            totalWeight += t.weight;

            let status = 'good';
            let grade = 'A';
            let percentile = 0;
            let vsIndustry = '';

            // Calculate percentile and industry comparison
            if (value >= t.industry.top10) {
                percentile = 90;
                vsIndustry = 'Top 10% of industry';
            } else if (value >= t.industry.top25) {
                percentile = 75;
                vsIndustry = 'Top 25% of industry';
            } else if (value >= t.industry.average) {
                percentile = 50;
                vsIndustry = 'At industry average';
            } else {
                percentile = Math.round((value / t.industry.average) * 50);
                vsIndustry = 'Below industry average';
            }

            // Determine status and grade
            if (value < t.critical) {
                status = 'critical';
                grade = 'F';
                analysis.criticalIssues.push({
                    metric: metricLabels[key],
                    score: value,
                    message: `${metricLabels[key]} is critically low at ${Math.round(value)}%`,
                    impact: metricImpacts[key],
                    urgency: 'Immediate action required'
                });
            } else if (value < t.warning) {
                status = 'warning';
                grade = value < 60 ? 'D' : 'C';
                analysis.warnings.push({
                    metric: metricLabels[key],
                    score: value,
                    message: `${metricLabels[key]} needs improvement (${Math.round(value)}%)`,
                    impact: metricImpacts[key],
                    urgency: 'Should be addressed within 2-4 weeks'
                });
            } else if (value >= t.good) {
                grade = value >= 95 ? 'A+' : 'A';
                analysis.strengths.push({
                    metric: metricLabels[key],
                    score: value,
                    message: `${metricLabels[key]} is excellent (${Math.round(value)}%)`,
                    competitive: vsIndustry
                });
            } else {
                grade = 'B';
            }

            // Trend analysis if historical data available
            let trend = 'stable';
            let trendValue = 0;
            if (historicalData.length >= 2) {
                const recentScores = historicalData.slice(0, 5).map(d => d.scores[key]).filter(s => s !== undefined);
                if (recentScores.length >= 2) {
                    const avg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
                    trendValue = value - avg;
                    trend = trendValue > 2 ? 'improving' : trendValue < -2 ? 'declining' : 'stable';
                }
            }

            analysis.metrics[key] = {
                score: Math.round(value * 10) / 10,
                status,
                grade,
                label: metricLabels[key],
                description: metricDescriptions[key],
                impact: metricImpacts[key],
                percentile,
                vsIndustry,
                benchmark: t.industry,
                trend,
                trendValue: Math.round(trendValue * 10) / 10,
                improvementPotential: Math.max(0, 100 - value)
            };

            // Industry benchmark data
            analysis.industryBenchmarks[key] = {
                current: Math.round(value),
                average: t.industry.average,
                top25: t.industry.top25,
                top10: t.industry.top10,
                gap: Math.round(t.industry.top25 - value)
            };
        }
    });

    // Calculate overall metrics
    analysis.overallScore = Math.round(weightedScore / totalWeight);

    // Determine overall grade
    if (analysis.overallScore >= 95) analysis.overallGrade = 'A+';
    else if (analysis.overallScore >= 90) analysis.overallGrade = 'A';
    else if (analysis.overallScore >= 80) analysis.overallGrade = 'B';
    else if (analysis.overallScore >= 70) analysis.overallGrade = 'C';
    else if (analysis.overallScore >= 60) analysis.overallGrade = 'D';
    else analysis.overallGrade = 'F';

    // Set overall status
    if (analysis.criticalIssues.length > 0) analysis.overall = 'critical';
    else if (analysis.warnings.length > 0) analysis.overall = 'warning';

    // Calculate risk and opportunity scores
    analysis.riskScore = analysis.criticalIssues.length * 30 + analysis.warnings.length * 15;
    analysis.opportunityScore = Object.values(analysis.metrics).reduce((acc, m) => acc + m.improvementPotential * thresholds[Object.keys(analysis.metrics).find(k => analysis.metrics[k] === m)]?.weight || 0, 0);

    // Generate executive summary
    const summaryParts = [];
    if (analysis.overall === 'critical') {
        summaryParts.push(`⚠️ **Urgent Attention Required**: ${analysis.criticalIssues.length} critical issue(s) detected that may be impacting user experience and business outcomes.`);
    } else if (analysis.overall === 'warning') {
        summaryParts.push(`📊 **Room for Improvement**: ${analysis.warnings.length} area(s) identified that could benefit from optimization.`);
    } else {
        summaryParts.push(`✅ **Healthy Status**: Your website is performing well across all key metrics.`);
    }

    if (analysis.strengths.length > 0) {
        summaryParts.push(`💪 **Strengths**: ${analysis.strengths.map(s => s.metric).join(', ')}`);
    }

    analysis.executiveSummary = summaryParts.join(' ');

    // Generate insights
    if (scores.performance < 70 && scores.seo > 80) {
        analysis.insights.push({
            type: 'opportunity',
            title: 'SEO investment at risk',
            message: 'Good SEO is being undermined by poor performance. Users finding your site through search may leave due to slow loading.'
        });
    }

    if (scores.accessibility < 80) {
        analysis.insights.push({
            type: 'risk',
            title: 'Accessibility compliance gap',
            message: 'Low accessibility scores may expose the business to legal risk and exclude 15-20% of potential users.'
        });
    }

    if (scores.performance > 90 && scores.accessibility > 90 && scores.seo > 90) {
        analysis.insights.push({
            type: 'strength',
            title: 'Competitive advantage',
            message: 'Scores across all metrics are in the top percentile. This provides a significant competitive advantage.'
        });
    }

    return analysis;
}

// ===== ENHANCED RECOMMENDATION ENGINE =====
function generateRecommendations(scores, opportunities, analysis = null) {
    const recommendations = [];
    const quickWins = [];
    const strategicInitiatives = [];

    // Helper function to calculate ROI
    const calculateROI = (cost, impactType, score) => {
        const impactMultipliers = {
            'conversion': 0.07,  // 7% conversion impact per second delay
            'traffic': 0.25,    // 25% potential traffic increase
            'retention': 0.15,  // 15% user retention impact
            'seo': 0.20        // 20% search ranking impact
        };
        const potentialGain = (100 - score) * impactMultipliers[impactType] * 100;
        return {
            estimated: Math.round(potentialGain),
            paybackPeriod: cost.max > 0 ? Math.ceil(cost.max / (potentialGain * 10)) + ' months' : 'Immediate',
            confidence: score < 50 ? 'High' : score < 75 ? 'Medium' : 'Low'
        };
    };

    // Performance recommendations - Tiered approach
    if (scores.performance < 50) {
        const roi = calculateROI({ min: 1200, max: 3500 }, 'conversion', scores.performance);
        recommendations.push({
            id: 'perf-critical',
            priority: 'critical',
            category: 'Performance',
            icon: '🚨',
            title: 'Critical Speed Optimization Required',
            subtitle: 'Severe impact on user experience and conversions',
            description: 'Your site loads very slowly, causing users to leave before content appears. Studies show that a 1-second delay in page load time reduces conversions by 7% and page views by 11%.',
            businessImpact: {
                conversions: '-35% to -50%',
                bounceRate: '+45% to +60%',
                seoRanking: 'Significant negative impact',
                userSatisfaction: 'Poor'
            },
            actions: [
                { task: 'Enable GZIP compression on server', effort: 'Low', time: '1 hour' },
                { task: 'Convert images to WebP format with fallbacks', effort: 'Medium', time: '2-4 hours' },
                { task: 'Implement lazy loading for below-fold images', effort: 'Low', time: '1-2 hours' },
                { task: 'Minimize and defer render-blocking JavaScript', effort: 'High', time: '4-8 hours' },
                { task: 'Implement CDN for static assets', effort: 'Medium', time: '2-4 hours' },
                { task: 'Enable browser caching headers', effort: 'Low', time: '1 hour' },
                { task: 'Consider Server-Side Rendering or Static Generation', effort: 'High', time: '1-2 weeks' }
            ],
            metrics: {
                currentScore: Math.round(scores.performance),
                targetScore: 85,
                improvement: `+${85 - Math.round(scores.performance)} points`
            },
            estimatedImpact: 'Could improve load time by 50-70% and increase conversions by 15-25%',
            timeline: '2-4 weeks for full implementation',
            cost: { min: 1200, max: 3500 },
            roi,
            caseStudy: 'A healthcare portal saw 40% fewer bounce rates after speed optimization'
        });

        quickWins.push({
            title: 'Enable compression',
            impact: '+10-15 points',
            time: '1 hour'
        });
    } else if (scores.performance < 75) {
        const roi = calculateROI({ min: 600, max: 1800 }, 'conversion', scores.performance);
        recommendations.push({
            id: 'perf-warning',
            priority: 'high',
            category: 'Performance',
            icon: '⚡',
            title: 'Performance Optimization Needed',
            subtitle: 'Impacting user experience and SEO rankings',
            description: 'Page speed is below optimal, affecting user experience and search engine rankings. Google uses Core Web Vitals as a ranking factor.',
            businessImpact: {
                conversions: '-10% to -20%',
                bounceRate: '+15% to +25%',
                seoRanking: 'Moderate negative impact',
                userSatisfaction: 'Below average'
            },
            actions: [
                { task: 'Optimize and compress images', effort: 'Medium', time: '2-3 hours' },
                { task: 'Remove unused JavaScript and CSS', effort: 'Medium', time: '3-5 hours' },
                { task: 'Implement browser caching', effort: 'Low', time: '1 hour' },
                { task: 'Optimize web fonts loading', effort: 'Low', time: '1-2 hours' }
            ],
            metrics: {
                currentScore: Math.round(scores.performance),
                targetScore: 90,
                improvement: `+${90 - Math.round(scores.performance)} points`
            },
            estimatedImpact: 'Could improve load time by 30-50%',
            timeline: '1-2 weeks',
            cost: { min: 600, max: 1800 },
            roi
        });
    } else if (scores.performance < 90) {
        quickWins.push({
            title: 'Fine-tune performance',
            impact: '+5-10 points',
            time: '2-4 hours',
            actions: ['Optimize third-party scripts', 'Preload critical resources']
        });
    }

    // Accessibility recommendations - Enhanced with legal context
    if (scores.accessibility < 70) {
        const roi = calculateROI({ min: 800, max: 2500 }, 'retention', scores.accessibility);
        recommendations.push({
            id: 'a11y-critical',
            priority: 'high',
            category: 'Accessibility',
            icon: '♿',
            title: 'Accessibility Compliance Required',
            subtitle: 'Legal risk and excluding 15-20% of users',
            description: 'Your site has significant accessibility barriers that may exclude users with disabilities. This creates legal risk under the Equality Act 2010 and WCAG guidelines.',
            businessImpact: {
                legalRisk: 'High - Potential discrimination claims',
                marketReach: '-15% to -20% of potential users',
                reputation: 'Risk of negative publicity',
                publicSector: 'May disqualify from government contracts'
            },
            actions: [
                { task: 'Add descriptive alt text to all images', effort: 'Medium', time: '2-4 hours' },
                { task: 'Ensure proper heading hierarchy (H1→H2→H3)', effort: 'Low', time: '1-2 hours' },
                { task: 'Fix color contrast ratios to 4.5:1 minimum', effort: 'Medium', time: '2-3 hours' },
                { task: 'Add ARIA labels to interactive elements', effort: 'Medium', time: '3-5 hours' },
                { task: 'Ensure full keyboard navigation support', effort: 'High', time: '4-8 hours' },
                { task: 'Add skip navigation links', effort: 'Low', time: '30 mins' },
                { task: 'Ensure form labels are properly associated', effort: 'Low', time: '1-2 hours' }
            ],
            metrics: {
                currentScore: Math.round(scores.accessibility),
                targetScore: 95,
                improvement: `+${95 - Math.round(scores.accessibility)} points`
            },
            estimatedImpact: 'Opens site to 15-20% more users and reduces legal risk',
            timeline: '1-2 weeks',
            cost: { min: 800, max: 2500 },
            roi,
            complianceNote: 'WCAG 2.1 Level AA is the recommended standard for healthcare sites'
        });
    } else if (scores.accessibility < 90) {
        recommendations.push({
            id: 'a11y-warning',
            priority: 'medium',
            category: 'Accessibility',
            icon: '♿',
            title: 'Accessibility Enhancement Recommended',
            subtitle: 'Minor improvements for full compliance',
            description: 'Your site has good accessibility foundations but could be improved for full WCAG 2.1 AA compliance.',
            actions: [
                { task: 'Audit and fix remaining contrast issues', effort: 'Low', time: '1-2 hours' },
                { task: 'Improve screen reader experience', effort: 'Medium', time: '2-4 hours' },
                { task: 'Test with actual assistive technologies', effort: 'Medium', time: '2-3 hours' }
            ],
            metrics: {
                currentScore: Math.round(scores.accessibility),
                targetScore: 98,
                improvement: `+${98 - Math.round(scores.accessibility)} points`
            },
            estimatedImpact: 'Achieves full compliance and best-in-class accessibility',
            timeline: '1 week',
            cost: { min: 400, max: 1000 }
        });
    }

    // SEO recommendations - With traffic projections
    if (scores.seo < 75) {
        const roi = calculateROI({ min: 600, max: 1500 }, 'traffic', scores.seo);
        recommendations.push({
            id: 'seo-high',
            priority: 'high',
            category: 'SEO',
            icon: '🔍',
            title: 'Search Engine Optimization Required',
            subtitle: 'Missing significant organic traffic opportunities',
            description: 'Your site is not fully optimized for search engines. Organic search typically drives 53% of all website traffic, and top 3 results get 75% of clicks.',
            businessImpact: {
                traffic: 'Missing 20-40% potential organic traffic',
                visibility: 'Lower ranking for relevant searches',
                costSavings: 'Missing free traffic, requiring paid ads instead',
                competitivePosition: 'Competitors may outrank you'
            },
            actions: [
                { task: 'Add unique meta descriptions to all pages', effort: 'Medium', time: '2-4 hours' },
                { task: 'Optimize title tags with target keywords', effort: 'Medium', time: '2-3 hours' },
                { task: 'Implement structured data (Schema.org)', effort: 'Medium', time: '3-5 hours' },
                { task: 'Fix broken links and redirects', effort: 'Low', time: '1-2 hours' },
                { task: 'Create and submit XML sitemap', effort: 'Low', time: '1 hour' },
                { task: 'Optimize page URLs and internal linking', effort: 'Medium', time: '2-4 hours' }
            ],
            metrics: {
                currentScore: Math.round(scores.seo),
                targetScore: 95,
                improvement: `+${95 - Math.round(scores.seo)} points`
            },
            estimatedImpact: 'Could increase organic traffic by 20-40% within 3-6 months',
            timeline: '1-2 weeks implementation, 2-3 months for ranking impact',
            cost: { min: 600, max: 1500 },
            roi
        });
    } else if (scores.seo < 90) {
        quickWins.push({
            title: 'SEO fine-tuning',
            impact: '+5-15% traffic',
            time: '4-6 hours',
            actions: ['Add structured data', 'Optimize meta descriptions']
        });
    }

    // Best Practices recommendations
    if (scores.bestPractices < 80) {
        recommendations.push({
            id: 'bp-medium',
            priority: 'medium',
            category: 'Best Practices',
            icon: '🛡️',
            title: 'Web Standards & Security Improvements',
            subtitle: 'Technical hygiene for reliability and security',
            description: 'Your site does not follow all modern web best practices, which can impact security, reliability, and maintenance costs.',
            businessImpact: {
                security: 'Potential vulnerability exposure',
                reliability: 'Higher risk of issues and downtime',
                maintenance: 'Increased long-term maintenance costs',
                trust: 'Browser warnings may reduce user trust'
            },
            actions: [
                { task: 'Ensure HTTPS is enforced on all pages', effort: 'Low', time: '1 hour' },
                { task: 'Fix console errors and warnings', effort: 'Medium', time: '2-4 hours' },
                { task: 'Update deprecated APIs and libraries', effort: 'Medium', time: '3-5 hours' },
                { task: 'Implement security headers (CSP, HSTS)', effort: 'Medium', time: '2-3 hours' },
                { task: 'Ensure no sensitive data in client-side code', effort: 'Low', time: '1-2 hours' }
            ],
            metrics: {
                currentScore: Math.round(scores.bestPractices),
                targetScore: 90,
                improvement: `+${90 - Math.round(scores.bestPractices)} points`
            },
            estimatedImpact: 'Improves security, reduces maintenance burden',
            timeline: '1-2 weeks',
            cost: { min: 400, max: 1000 }
        });
    }

    // Add recommendations from identified opportunities
    opportunities.forEach(opp => {
        const existing = recommendations.find(r => r.title.toLowerCase().includes(opp.toLowerCase().split(' ')[0]));
        if (!existing) {
            const value = config.revenue.painPointValues[opp] || { min: 400, max: 1000, priority: 'medium' };
            recommendations.push({
                id: `opp-${opp.toLowerCase().replace(/\s+/g, '-')}`,
                priority: value.priority,
                category: 'Identified Opportunity',
                icon: '💡',
                title: opp,
                subtitle: 'Opportunity identified during audit',
                description: `This issue was identified during the automated audit process and represents a potential improvement area.`,
                actions: [
                    { task: 'Schedule detailed technical assessment', effort: 'Low', time: '1-2 hours' },
                    { task: 'Develop implementation roadmap', effort: 'Medium', time: '2-4 hours' }
                ],
                estimatedImpact: 'Impact assessment available upon detailed review',
                cost: { min: value.min, max: value.max }
            });
        }
    });

    // Calculate totals and generate summary
    const totalCost = recommendations.reduce((acc, r) => ({
        min: acc.min + r.cost.min,
        max: acc.max + r.cost.max
    }), { min: 0, max: 0 });

    // Prioritized package recommendations
    const packages = [];

    const criticalRecs = recommendations.filter(r => r.priority === 'critical');
    const highRecs = recommendations.filter(r => r.priority === 'high');
    const mediumRecs = recommendations.filter(r => r.priority === 'medium');

    if (criticalRecs.length > 0) {
        packages.push({
            name: 'Emergency Fix',
            description: 'Address critical issues immediately',
            recommendations: criticalRecs.map(r => r.id),
            cost: criticalRecs.reduce((a, r) => ({ min: a.min + r.cost.min, max: a.max + r.cost.max }), { min: 0, max: 0 }),
            timeline: '1-2 weeks',
            priority: 'Immediate'
        });
    }

    if (highRecs.length > 0 || criticalRecs.length > 0) {
        packages.push({
            name: 'Foundation Package',
            description: 'Fix critical and high priority issues',
            recommendations: [...criticalRecs, ...highRecs].map(r => r.id),
            cost: [...criticalRecs, ...highRecs].reduce((a, r) => ({ min: a.min + r.cost.min, max: a.max + r.cost.max }), { min: 0, max: 0 }),
            timeline: '2-4 weeks',
            priority: 'High'
        });
    }

    packages.push({
        name: 'Complete Optimization',
        description: 'Full implementation of all recommendations',
        recommendations: recommendations.map(r => r.id),
        cost: totalCost,
        timeline: '4-8 weeks',
        priority: 'Comprehensive'
    });

    // Sort recommendations by priority
    const sorted = recommendations.sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    return {
        recommendations: sorted,
        quickWins,
        packages,
        summary: {
            totalRecommendations: recommendations.length,
            criticalCount: criticalRecs.length,
            highCount: highRecs.length,
            mediumCount: mediumRecs.length,
            totalCost,
            estimatedTimeline: criticalRecs.length > 0 ? '2-4 weeks' : highRecs.length > 0 ? '1-3 weeks' : '1-2 weeks'
        }
    };
}

// ===== ENHANCED DETAILED REPORT GENERATOR =====
function generateDetailedReport(target, auditData, analysis, recommendationsData) {
    const revenue = calculateRevenue(auditData.opportunities || []);
    const date = new Date(auditData.timestamp).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric'
    });
    const time = new Date(auditData.timestamp).toLocaleTimeString('en-GB', {
        hour: '2-digit', minute: '2-digit'
    });

    // Handle both old format (array) and new format (object with recommendations array)
    const recommendations = Array.isArray(recommendationsData)
        ? recommendationsData
        : (recommendationsData.recommendations || []);
    const quickWins = recommendationsData.quickWins || [];
    const packages = recommendationsData.packages || [];
    const summary = recommendationsData.summary || {};

    // Calculate total investment from recommendations
    const totalInvestment = recommendations.reduce((acc, r) => ({
        min: acc.min + (r.cost?.min || 0),
        max: acc.max + (r.cost?.max || 0)
    }), { min: 0, max: 0 });

    // Grade color mapping
    const gradeColors = {
        'A+': '#059669', 'A': '#10b981', 'B': '#84cc16',
        'C': '#f59e0b', 'D': '#ef4444', 'F': '#dc2626'
    };

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Website Performance & Health Report - ${target.name}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
            --primary: #6366f1;
            --primary-dark: #4f46e5;
            --success: #10b981;
            --warning: #f59e0b;
            --danger: #ef4444;
            --text: #1e293b;
            --text-muted: #64748b;
            --bg: #f8fafc;
            --surface: #ffffff;
            --border: #e2e8f0;
        }
        body { 
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; 
            background: var(--bg); 
            color: var(--text); 
            line-height: 1.7;
            font-size: 15px;
        }
        .container { max-width: 1000px; margin: 0 auto; padding: 48px 32px; }
        
        /* Cover Page */
        .cover { 
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
            color: white;
            padding: 80px 48px;
            border-radius: 24px;
            margin-bottom: 40px;
            text-align: center;
            position: relative;
            overflow: hidden;
        }
        .cover::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
            opacity: 0.5;
        }
        .cover-content { position: relative; z-index: 1; }
        .cover-badge { 
            display: inline-block;
            padding: 8px 16px; 
            background: rgba(99, 102, 241, 0.3);
            border: 1px solid rgba(99, 102, 241, 0.5);
            border-radius: 999px; 
            font-size: 0.75rem;
            font-weight: 600;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            margin-bottom: 24px;
        }
        .cover h1 { 
            font-size: 2.8rem; 
            font-weight: 800; 
            margin-bottom: 16px;
            background: linear-gradient(135deg, #ffffff 0%, #94a3b8 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        .cover .site-name { 
            font-size: 1.4rem; 
            color: #94a3b8;
            margin-bottom: 8px;
        }
        .cover .site-url { 
            font-size: 0.9rem; 
            color: #64748b;
            margin-bottom: 32px;
        }
        .cover-meta { 
            display: flex;
            justify-content: center;
            gap: 32px;
            font-size: 0.85rem;
            color: #94a3b8;
        }
        .cover-meta span { display: flex; align-items: center; gap: 8px; }
        
        /* Grade Badge */
        .grade-badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 80px;
            height: 80px;
            border-radius: 50%;
            font-size: 2rem;
            font-weight: 800;
            margin: 24px 0;
            border: 4px solid;
        }

        /* Section Styling */
        .section { 
            background: var(--surface); 
            border-radius: 20px; 
            padding: 36px; 
            margin-bottom: 28px; 
            box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04);
            border: 1px solid var(--border);
        }
        .section-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 2px solid var(--border);
        }
        .section-icon {
            width: 44px;
            height: 44px;
            background: linear-gradient(135deg, var(--primary), #a855f7);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.3rem;
        }
        .section-title { 
            font-size: 1.4rem; 
            font-weight: 700; 
            color: var(--text);
        }
        .section-subtitle {
            font-size: 0.85rem;
            color: var(--text-muted);
        }

        /* Executive Summary */
        .exec-summary {
            background: linear-gradient(135deg, #f0f9ff 0%, #f8fafc 100%);
            border: 1px solid #bae6fd;
            border-radius: 16px;
            padding: 24px;
            margin-bottom: 24px;
        }
        .exec-summary h4 {
            color: #0369a1;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 12px;
        }
        .exec-summary p {
            color: #0c4a6e;
            font-size: 1rem;
            line-height: 1.8;
        }

        /* Score Cards */
        .scores-grid { 
            display: grid; 
            grid-template-columns: repeat(4, 1fr); 
            gap: 16px;
            margin-bottom: 24px;
        }
        .score-card { 
            text-align: center; 
            padding: 24px 16px; 
            border-radius: 16px;
            border: 1px solid var(--border);
            position: relative;
            overflow: hidden;
        }
        .score-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
        }
        .score-card.critical { background: linear-gradient(180deg, #fef2f2 0%, #fff 100%); }
        .score-card.critical::before { background: var(--danger); }
        .score-card.warning { background: linear-gradient(180deg, #fffbeb 0%, #fff 100%); }
        .score-card.warning::before { background: var(--warning); }
        .score-card.good { background: linear-gradient(180deg, #f0fdf4 0%, #fff 100%); }
        .score-card.good::before { background: var(--success); }
        .score-card .score { 
            font-size: 2.5rem; 
            font-weight: 800; 
            line-height: 1;
        }
        .score-card.critical .score { color: var(--danger); }
        .score-card.warning .score { color: var(--warning); }
        .score-card.good .score { color: var(--success); }
        .score-card .grade {
            font-size: 0.75rem;
            font-weight: 700;
            padding: 3px 10px;
            border-radius: 999px;
            display: inline-block;
            margin: 8px 0;
        }
        .score-card .label { 
            font-size: 0.85rem; 
            font-weight: 600;
            color: var(--text);
            margin-bottom: 4px;
        }
        .score-card .benchmark { 
            font-size: 0.7rem; 
            color: var(--text-muted);
        }

        /* Overall Score Hero */
        .overall-hero { 
            display: flex;
            align-items: center;
            gap: 32px;
            padding: 32px;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);
            border-radius: 20px;
            color: white;
            margin-bottom: 28px;
        }
        .overall-hero .score-circle {
            width: 140px;
            height: 140px;
            border-radius: 50%;
            background: rgba(255,255,255,0.15);
            border: 6px solid rgba(255,255,255,0.3);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }
        .overall-hero .score-value { font-size: 3.5rem; font-weight: 800; line-height: 1; }
        .overall-hero .score-label { font-size: 0.85rem; opacity: 0.8; }
        .overall-hero .info { flex: 1; }
        .overall-hero h3 { font-size: 1.6rem; margin-bottom: 8px; }
        .overall-hero p { opacity: 0.9; font-size: 1rem; line-height: 1.7; }
        .overall-hero .grade-pill {
            display: inline-block;
            padding: 6px 16px;
            background: rgba(255,255,255,0.2);
            border-radius: 999px;
            font-weight: 700;
            font-size: 0.9rem;
            margin-top: 12px;
        }

        /* Metric Details */
        .metric-detail {
            background: #f8fafc;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 16px;
        }
        .metric-detail-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        }
        .metric-detail h4 { font-size: 1rem; font-weight: 600; }
        .metric-detail .vs-industry {
            font-size: 0.75rem;
            padding: 4px 10px;
            border-radius: 999px;
            font-weight: 600;
        }
        .metric-detail .description { color: var(--text-muted); font-size: 0.9rem; margin-bottom: 16px; }
        .benchmark-bar {
            height: 8px;
            background: #e2e8f0;
            border-radius: 999px;
            position: relative;
            margin: 16px 0;
        }
        .benchmark-bar .current {
            position: absolute;
            height: 100%;
            border-radius: 999px;
            background: linear-gradient(90deg, var(--primary), #a855f7);
        }
        .benchmark-bar .marker {
            position: absolute;
            top: -4px;
            width: 2px;
            height: 16px;
            background: #64748b;
        }
        .benchmark-legend {
            display: flex;
            justify-content: space-between;
            font-size: 0.7rem;
            color: var(--text-muted);
        }

        /* Findings */
        .findings-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
        }
        .finding-card {
            padding: 20px;
            border-radius: 12px;
            border: 1px solid var(--border);
        }
        .finding-card.critical { background: #fef2f2; border-color: #fecaca; }
        .finding-card.warning { background: #fffbeb; border-color: #fde68a; }
        .finding-card.good { background: #f0fdf4; border-color: #bbf7d0; }
        .finding-card h5 {
            font-size: 0.8rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .finding-card.critical h5 { color: var(--danger); }
        .finding-card.warning h5 { color: var(--warning); }
        .finding-card.good h5 { color: var(--success); }
        .finding-card ul { 
            list-style: none; 
            font-size: 0.85rem;
        }
        .finding-card li {
            padding: 6px 0;
            border-bottom: 1px solid rgba(0,0,0,0.05);
        }
        .finding-card li:last-child { border: none; }

        /* Recommendations */
        .recommendation { 
            padding: 24px; 
            border-radius: 16px; 
            margin-bottom: 20px; 
            border-left: 5px solid;
            background: var(--surface);
            border: 1px solid var(--border);
            border-left-width: 5px;
        }
        .recommendation.critical { 
            background: linear-gradient(90deg, #fef2f2 0%, #fff 10%);
            border-left-color: var(--danger);
        }
        .recommendation.high { 
            background: linear-gradient(90deg, #fff7ed 0%, #fff 10%);
            border-left-color: #ea580c;
        }
        .recommendation.medium { 
            background: linear-gradient(90deg, #fefce8 0%, #fff 10%);
            border-left-color: #ca8a04;
        }
        .recommendation-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 16px;
        }
        .recommendation .priority-tag { 
            padding: 5px 14px; 
            border-radius: 999px; 
            font-size: 0.7rem; 
            font-weight: 700; 
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        .recommendation.critical .priority-tag { background: var(--danger); color: white; }
        .recommendation.high .priority-tag { background: #ea580c; color: white; }
        .recommendation.medium .priority-tag { background: #ca8a04; color: white; }
        .recommendation h4 { 
            font-size: 1.15rem; 
            color: var(--text); 
            margin-bottom: 4px;
        }
        .recommendation .subtitle {
            font-size: 0.85rem;
            color: var(--text-muted);
        }
        .recommendation p { color: #475569; margin: 16px 0; }
        .recommendation .actions-list {
            background: rgba(0,0,0,0.02);
            border-radius: 12px;
            padding: 16px 20px;
            margin: 16px 0;
        }
        .recommendation .actions-list h5 {
            font-size: 0.75rem;
            text-transform: uppercase;
            color: var(--text-muted);
            margin-bottom: 12px;
        }
        .recommendation .action-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid rgba(0,0,0,0.05);
            font-size: 0.9rem;
        }
        .recommendation .action-item:last-child { border: none; }
        .recommendation .action-effort {
            display: flex;
            gap: 12px;
            font-size: 0.75rem;
            color: var(--text-muted);
        }
        .recommendation .metrics-row {
            display: flex;
            gap: 24px;
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid var(--border);
        }
        .recommendation .metric-item {
            flex: 1;
            text-align: center;
            padding: 12px;
            background: rgba(0,0,0,0.02);
            border-radius: 8px;
        }
        .recommendation .metric-item .value {
            font-size: 1.1rem;
            font-weight: 700;
            color: var(--primary);
        }
        .recommendation .metric-item .label {
            font-size: 0.7rem;
            color: var(--text-muted);
            text-transform: uppercase;
        }

        /* Quick Wins */
        .quick-wins {
            background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
            border: 1px solid #bbf7d0;
            border-radius: 16px;
            padding: 24px;
            margin-bottom: 24px;
        }
        .quick-wins h4 {
            color: #166534;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .quick-win-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 16px;
            background: white;
            border-radius: 10px;
            margin-bottom: 8px;
            border: 1px solid #bbf7d0;
        }
        .quick-win-item:last-child { margin-bottom: 0; }
        .quick-win-item .impact { 
            color: var(--success);
            font-weight: 600;
            font-size: 0.85rem;
        }

        /* Investment Packages */
        .packages-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-bottom: 24px;
        }
        .package-card {
            border: 2px solid var(--border);
            border-radius: 16px;
            padding: 24px;
            text-align: center;
            transition: all 0.3s;
        }
        .package-card.featured {
            border-color: var(--primary);
            background: linear-gradient(180deg, #f0f0ff 0%, #fff 100%);
            transform: scale(1.02);
        }
        .package-card h4 { font-size: 1.1rem; margin-bottom: 8px; }
        .package-card .description { 
            font-size: 0.85rem; 
            color: var(--text-muted);
            margin-bottom: 16px;
        }
        .package-card .price {
            font-size: 1.8rem;
            font-weight: 800;
            color: var(--primary);
            margin-bottom: 8px;
        }
        .package-card .timeline {
            font-size: 0.8rem;
            color: var(--text-muted);
        }

        /* Investment Summary */
        .investment-card { 
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            text-align: center;
            padding: 40px;
            border-radius: 20px;
            margin-bottom: 28px;
        }
        .investment-card h3 { 
            font-size: 1.2rem; 
            opacity: 0.9;
            margin-bottom: 16px;
        }
        .investment-card .range { 
            font-size: 3rem; 
            font-weight: 800;
            margin-bottom: 8px;
        }
        .investment-card .subtitle {
            opacity: 0.8;
            font-size: 0.95rem;
        }
        .investment-card .roi-note {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid rgba(255,255,255,0.2);
            font-size: 0.9rem;
            opacity: 0.9;
        }

        /* CTA Section */
        .cta { 
            text-align: center; 
            padding: 48px; 
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            color: white;
            border-radius: 20px;
            margin-bottom: 28px;
        }
        .cta h3 { font-size: 1.8rem; margin-bottom: 12px; }
        .cta p { color: #94a3b8; margin-bottom: 28px; max-width: 500px; margin-left: auto; margin-right: auto; }
        .cta-btn { 
            display: inline-block; 
            padding: 16px 40px; 
            background: linear-gradient(135deg, var(--primary), #a855f7);
            color: white; 
            text-decoration: none; 
            border-radius: 12px; 
            font-weight: 700;
            font-size: 1rem;
            transition: transform 0.2s;
        }
        .cta-btn:hover { transform: translateY(-2px); }

        /* Footer */
        .footer { 
            text-align: center; 
            padding: 32px;
            color: var(--text-muted);
            font-size: 0.85rem;
        }
        .footer-logo {
            font-size: 1.2rem;
            font-weight: 700;
            background: linear-gradient(135deg, var(--primary), #a855f7);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 8px;
        }

        /* Print Styles */
        @media print { 
            body { background: white; font-size: 12px; }
            .container { padding: 20px; }
            .section { box-shadow: none; border: 1px solid #e2e8f0; page-break-inside: avoid; }
            .cover { padding: 40px; }
            .cta-btn { background: var(--primary); -webkit-print-color-adjust: exact; }
        }
        @media (max-width: 768px) { 
            .scores-grid { grid-template-columns: repeat(2, 1fr); }
            .findings-grid { grid-template-columns: 1fr; }
            .packages-grid { grid-template-columns: 1fr; }
            .overall-hero { flex-direction: column; text-align: center; }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Cover Page -->
        <div class="cover">
            <div class="cover-content">
                <span class="cover-badge">🔍 Performance Audit Report</span>
                <h1>Website Health Assessment</h1>
                <div class="site-name">${target.name}</div>
                <div class="site-url">${target.url}</div>
                <div class="grade-badge" style="color: ${gradeColors[analysis.overallGrade] || '#6366f1'}; border-color: ${gradeColors[analysis.overallGrade] || '#6366f1'}; background: rgba(255,255,255,0.1);">
                    ${analysis.overallGrade || 'N/A'}
                </div>
                <div class="cover-meta">
                    <span>📅 ${date}</span>
                    <span>🕐 ${time}</span>
                    <span>📊 ${target.type || 'Website'}</span>
                </div>
            </div>
        </div>

        <!-- Overall Score Hero -->
        <div class="overall-hero">
            <div class="score-circle">
                <span class="score-value">${analysis.overallScore}</span>
                <span class="score-label">Overall Score</span>
            </div>
            <div class="info">
                <h3>${analysis.overall === 'critical' ? '🚨 Immediate Attention Required' : analysis.overall === 'warning' ? '⚠️ Room for Improvement' : '✅ Looking Good!'}</h3>
                <p>${analysis.executiveSummary || (analysis.overall === 'critical'
            ? 'Critical issues have been identified that may be significantly impacting user experience and business outcomes. Immediate action is recommended.'
            : analysis.overall === 'warning'
                ? 'Several areas have been identified that could benefit from optimization to improve performance and user experience.'
                : 'Your website is performing well across key metrics. Minor optimizations may still yield improvements.')}</p>
                <span class="grade-pill">Grade: ${analysis.overallGrade || 'N/A'}</span>
            </div>
        </div>

        <!-- Executive Summary -->
        <div class="section">
            <div class="section-header">
                <div class="section-icon">📋</div>
                <div>
                    <div class="section-title">Executive Summary</div>
                    <div class="section-subtitle">High-level overview of your website's health</div>
                </div>
            </div>
            
            <div class="exec-summary">
                <h4>Key Takeaways</h4>
                <p>
                    This comprehensive audit of <strong>${target.name}</strong> analyzed ${Object.keys(analysis.metrics).length} key performance metrics 
                    against industry benchmarks. 
                    ${analysis.criticalIssues?.length > 0 ? `<br><br>🔴 <strong>${analysis.criticalIssues.length} critical issue(s)</strong> require immediate attention.` : ''}
                    ${analysis.warnings?.length > 0 ? `<br>🟡 <strong>${analysis.warnings.length} warning(s)</strong> should be addressed soon.` : ''}
                    ${analysis.strengths?.length > 0 ? `<br>🟢 <strong>${analysis.strengths.length} strength(s)</strong> demonstrate good practices.` : ''}
                    <br><br>
                    Total estimated investment to address all findings: <strong>£${totalInvestment.min.toLocaleString()} - £${totalInvestment.max.toLocaleString()}</strong>
                </p>
            </div>

            <!-- Score Cards -->
            <div class="scores-grid">
                ${Object.entries(analysis.metrics).map(([key, m]) => `
                    <div class="score-card ${m.status}">
                        <div class="score">${Math.round(m.score)}</div>
                        <div class="grade" style="background: ${gradeColors[m.grade] || '#6366f1'}20; color: ${gradeColors[m.grade] || '#6366f1'};">${m.grade || 'N/A'}</div>
                        <div class="label">${m.label}</div>
                        <div class="benchmark">${m.vsIndustry || 'vs. industry'}</div>
                    </div>
                `).join('')}
            </div>
        </div>

        <!-- Detailed Metrics -->
        <div class="section">
            <div class="section-header">
                <div class="section-icon">📊</div>
                <div>
                    <div class="section-title">Detailed Metric Breakdown</div>
                    <div class="section-subtitle">Performance against industry benchmarks</div>
                </div>
            </div>

            ${Object.entries(analysis.metrics).map(([key, m]) => `
                <div class="metric-detail">
                    <div class="metric-detail-header">
                        <h4>${m.label}</h4>
                        <span class="vs-industry" style="background: ${m.status === 'good' ? '#dcfce7' : m.status === 'warning' ? '#fef3c7' : '#fee2e2'}; color: ${m.status === 'good' ? '#166534' : m.status === 'warning' ? '#92400e' : '#991b1b'};">
                            ${m.vsIndustry || 'Industry comparison'}
                        </span>
                    </div>
                    <p class="description">${m.description || ''}</p>
                    <div class="benchmark-bar">
                        <div class="current" style="width: ${m.score}%;"></div>
                        ${m.benchmark ? `
                            <div class="marker" style="left: ${m.benchmark.average}%;" title="Industry Average"></div>
                            <div class="marker" style="left: ${m.benchmark.top25}%; background: var(--success);" title="Top 25%"></div>
                        ` : ''}
                    </div>
                    <div class="benchmark-legend">
                        <span>0</span>
                        <span>Industry Avg: ${m.benchmark?.average || 65}</span>
                        <span>Top 25%: ${m.benchmark?.top25 || 85}</span>
                        <span>100</span>
                    </div>
                </div>
            `).join('')}
        </div>

        <!-- Key Findings -->
        <div class="section">
            <div class="section-header">
                <div class="section-icon">🔎</div>
                <div>
                    <div class="section-title">Key Findings</div>
                    <div class="section-subtitle">Issues and strengths identified during the audit</div>
                </div>
            </div>

            <div class="findings-grid">
                ${analysis.criticalIssues?.length > 0 ? `
                    <div class="finding-card critical">
                        <h5>🔴 Critical Issues (${analysis.criticalIssues.length})</h5>
                        <ul>
                            ${analysis.criticalIssues.map(i => `<li>${typeof i === 'object' ? i.message : i}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                ${analysis.warnings?.length > 0 ? `
                    <div class="finding-card warning">
                        <h5>🟡 Warnings (${analysis.warnings.length})</h5>
                        <ul>
                            ${analysis.warnings.map(i => `<li>${typeof i === 'object' ? i.message : i}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                ${analysis.strengths?.length > 0 ? `
                    <div class="finding-card good">
                        <h5>🟢 Strengths (${analysis.strengths.length})</h5>
                        <ul>
                            ${analysis.strengths.map(i => `<li>${typeof i === 'object' ? i.message : i}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        </div>

        ${quickWins.length > 0 ? `
        <!-- Quick Wins -->
        <div class="quick-wins">
            <h4>⚡ Quick Wins - Low Effort, High Impact</h4>
            ${quickWins.map(qw => `
                <div class="quick-win-item">
                    <div>
                        <strong>${qw.title}</strong>
                        ${qw.actions ? `<br><small style="color: #64748b;">${qw.actions.join(', ')}</small>` : ''}
                    </div>
                    <div style="text-align: right;">
                        <span class="impact">${qw.impact}</span><br>
                        <small style="color: #64748b;">⏱ ${qw.time}</small>
                    </div>
                </div>
            `).join('')}
        </div>
        ` : ''}

        <!-- Recommendations -->
        <div class="section">
            <div class="section-header">
                <div class="section-icon">💡</div>
                <div>
                    <div class="section-title">Recommendations</div>
                    <div class="section-subtitle">Prioritized action items with implementation details</div>
                </div>
            </div>

            ${recommendations.map(r => `
                <div class="recommendation ${r.priority}">
                    <div class="recommendation-header">
                        <div>
                            <h4>${r.icon || '📌'} ${r.title}</h4>
                            ${r.subtitle ? `<div class="subtitle">${r.subtitle}</div>` : ''}
                        </div>
                        <span class="priority-tag">${r.priority}</span>
                    </div>
                    <p>${r.description}</p>
                    
                    ${r.actions?.length > 0 ? `
                    <div class="actions-list">
                        <h5>Action Items</h5>
                        ${r.actions.map(a => `
                            <div class="action-item">
                                <span>${typeof a === 'object' ? a.task : a}</span>
                                ${typeof a === 'object' ? `
                                    <span class="action-effort">
                                        <span>Effort: ${a.effort || 'Medium'}</span>
                                        <span>⏱ ${a.time || 'TBD'}</span>
                                    </span>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>
                    ` : ''}

                    <div class="metrics-row">
                        ${r.metrics ? `
                            <div class="metric-item">
                                <div class="value">${r.metrics.currentScore}%</div>
                                <div class="label">Current</div>
                            </div>
                            <div class="metric-item">
                                <div class="value">${r.metrics.targetScore}%</div>
                                <div class="label">Target</div>
                            </div>
                            <div class="metric-item">
                                <div class="value">${r.metrics.improvement}</div>
                                <div class="label">Improvement</div>
                            </div>
                        ` : ''}
                        <div class="metric-item">
                            <div class="value">£${r.cost?.min?.toLocaleString() || 0} - £${r.cost?.max?.toLocaleString() || 0}</div>
                            <div class="label">Investment</div>
                        </div>
                        ${r.timeline ? `
                            <div class="metric-item">
                                <div class="value">${r.timeline}</div>
                                <div class="label">Timeline</div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `).join('')}
        </div>

        ${packages.length > 0 ? `
        <!-- Investment Packages -->
        <div class="section">
            <div class="section-header">
                <div class="section-icon">📦</div>
                <div>
                    <div class="section-title">Investment Options</div>
                    <div class="section-subtitle">Choose the package that fits your needs</div>
                </div>
            </div>

            <div class="packages-grid">
                ${packages.map((pkg, idx) => `
                    <div class="package-card ${idx === packages.length - 1 ? 'featured' : ''}">
                        <h4>${pkg.name}</h4>
                        <div class="description">${pkg.description}</div>
                        <div class="price">£${pkg.cost?.min?.toLocaleString() || 0} - £${pkg.cost?.max?.toLocaleString() || 0}</div>
                        <div class="timeline">⏱ ${pkg.timeline}</div>
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}

        <!-- Investment Summary -->
        <div class="investment-card">
            <h3>Total Recommended Investment</h3>
            <div class="range">£${totalInvestment.min.toLocaleString()} - £${totalInvestment.max.toLocaleString()}</div>
            <div class="subtitle">To implement all ${recommendations.length} recommendations</div>
            <div class="roi-note">
                💡 Addressing these issues typically results in 15-40% improvement in key business metrics including conversions, user engagement, and search rankings.
            </div>
        </div>

        <!-- CTA -->
        <div class="cta">
            <h3>Ready to Transform Your Website?</h3>
            <p>Our team specializes in implementing these optimizations for healthcare and compliance platforms. Let's discuss your priorities.</p>
            <a href="mailto:hello@example.com?subject=Website%20Optimization%20-%20${encodeURIComponent(target.name)}" class="cta-btn">
                Schedule a Call →
            </a>
        </div>

        <!-- Footer -->
        <div class="footer">
            <div class="footer-logo">🛡️ Maintenance OS</div>
            <p>Report generated on ${date} at ${time}</p>
            <p style="margin-top: 8px; font-size: 0.75rem;">This report is confidential and intended solely for ${target.name}.</p>
        </div>
    </div>
</body>
</html>`;
}

// ===== AUTH MIDDLEWARE =====
function authMiddleware(req, res, next) {
    if (!config.auth.enabled) return next();

    const sessionId = req.headers.cookie?.match(/session=([^;]+)/)?.[1];
    if (sessionId && sessions.has(sessionId)) {
        req.user = sessions.get(sessionId);
        return next();
    }

    if (req.path === '/login' || req.path.startsWith('/api/login')) return next();

    if (req.path.startsWith('/api/')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    return res.redirect('/login');
}

app.use(authMiddleware);

// ===== LOGIN PAGE =====
app.get('/login', (req, res) => {
    res.send(getLoginPage());
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = config.auth.users.find(u => u.username === username);

    // Simple password check (in production use bcrypt.compare)
    if (user && (password === 'maintenance123' || password === 'view123')) {
        const sessionId = Math.random().toString(36).substring(2);
        sessions.set(sessionId, { username, role: user.role });
        res.setHeader('Set-Cookie', `session=${sessionId}; Path=/; HttpOnly; Max-Age=${config.auth.sessionMaxAge / 1000}`);
        return res.json({ success: true });
    }
    res.status(401).json({ error: 'Invalid credentials' });
});

app.post('/api/logout', (req, res) => {
    const sessionId = req.headers.cookie?.match(/session=([^;]+)/)?.[1];
    if (sessionId) sessions.delete(sessionId);
    res.setHeader('Set-Cookie', 'session=; Path=/; Max-Age=0');
    res.json({ success: true });
});

// ===== API ENDPOINTS =====
app.get('/api/data', (req, res) => {
    const data = getAllAuditData();
    if (req.query.format === 'csv') {
        const headers = 'Site,URL,Timestamp,Performance,Accessibility,SEO,Uptime,PainPoints,EstValue\n';
        const rows = data.map(d => {
            const target = config.targets.find(t => t.id === d.targetId);
            const opps = (d.opportunities || []).join('; ');
            const rev = calculateRevenue(d.opportunities || []);
            return `"${target?.name}","${target?.url}","${new Date(d.timestamp).toISOString()}",${d.scores.performance},${d.scores.accessibility},${d.scores.seo},"${d.uptime.status}","${opps}","£${rev.min}-${rev.max}"`;
        }).join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=maintenance_data.csv');
        return res.send(headers + rows);
    }
    res.json(data);
});

app.get('/api/trends/:targetId', (req, res) => {
    const data = getAllAuditData().filter(d => d.targetId === req.params.targetId).slice(0, 30);
    res.json(data.reverse());
});

app.get('/api/revenue', (req, res) => {
    const latest = getLatestReports();
    let totalMin = 0, totalMax = 0;
    const breakdown = [];

    latest.forEach(r => {
        const target = config.targets.find(t => t.id === r.targetId);
        (r.opportunities || []).forEach(opp => {
            const value = config.revenue.painPointValues[opp] || { min: 500, max: 1000, priority: 'medium' };
            totalMin += value.min;
            totalMax += value.max;
            breakdown.push({ site: target?.name, type: opp, ...value });
        });
    });

    res.json({ totalMin, totalMax, breakdown, count: breakdown.length });
});

app.post('/api/audit/:targetId', async (req, res) => {
    const target = getAllTargets().find(t => t.id === req.params.targetId);
    if (!target) return res.status(404).json({ error: 'Target not found' });
    try {
        const result = await runAudit(target, config.audit);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/audit/all', async (req, res) => {
    try {
        const results = [];
        for (const target of getAllTargets()) {
            results.push(await runAudit(target, config.audit));
        }
        res.json({ success: true, results });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===== SITE MANAGEMENT API =====
app.get('/api/sites', (req, res) => {
    const dynamic = loadDynamicData();
    res.json({
        static: config.targets,
        dynamic: dynamic.targets,
        all: getAllTargets()
    });
});

app.post('/api/sites/add', async (req, res) => {
    const { url, clientName } = req.body;

    if (!url) return res.status(400).json({ error: 'URL is required' });

    try {
        // Validate URL
        const urlObj = new URL(url);
        const hostname = urlObj.hostname;

        // Auto-generate site info from URL
        const siteName = hostname
            .replace(/^www\./, '')
            .split('.')[0]
            .replace(/-/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());

        const siteId = hostname.replace(/\./g, '_').replace(/[^a-z0-9_]/gi, '').toLowerCase();

        // Check if already exists
        const allTargets = getAllTargets();
        if (allTargets.find(t => t.id === siteId || t.url === url)) {
            return res.status(400).json({ error: 'Site already exists' });
        }

        // Load dynamic data
        const data = loadDynamicData();

        // Create or find client
        let clientId = 'quick_add';
        if (clientName) {
            clientId = clientName.toLowerCase().replace(/\s+/g, '_');
            if (!data.clients.find(c => c.id === clientId)) {
                data.clients.push({
                    id: clientId,
                    name: clientName,
                    tier: 'Standard',
                    email: ''
                });
            }
        } else if (!data.clients.find(c => c.id === 'quick_add')) {
            data.clients.push({
                id: 'quick_add',
                name: 'Quick Add Sites',
                tier: 'Standard',
                email: ''
            });
        }

        // Add new target
        const newTarget = {
            name: siteName,
            url: url,
            id: siteId,
            clientId: clientId,
            type: 'Website',
            addedAt: Date.now()
        };

        data.targets.push(newTarget);
        saveDynamicData(data);

        // Optionally run initial audit
        let auditResult = null;
        if (req.body.runAudit) {
            try {
                auditResult = await runAudit(newTarget, config.audit);
            } catch (e) {
                console.error('Initial audit failed:', e.message);
            }
        }

        res.json({
            success: true,
            site: newTarget,
            audit: auditResult
        });

    } catch (err) {
        res.status(400).json({ error: 'Invalid URL: ' + err.message });
    }
});

app.delete('/api/sites/:siteId', (req, res) => {
    const siteId = req.params.siteId;

    // Can't delete static config sites
    if (config.targets.find(t => t.id === siteId)) {
        return res.status(400).json({ error: 'Cannot delete built-in sites. Edit config.js instead.' });
    }

    const data = loadDynamicData();
    const idx = data.targets.findIndex(t => t.id === siteId);

    if (idx === -1) {
        return res.status(404).json({ error: 'Site not found' });
    }

    data.targets.splice(idx, 1);
    saveDynamicData(data);

    res.json({ success: true });
});

app.get('/api/strategy', (req, res) => {
    const content = fs.readFileSync(path.join(__dirname, 'MAINTENANCE_OFFERING.md'), 'utf8');
    res.send(`<div style="color:var(--text);font-family:inherit;"><h1 style="color:var(--accent)">Growth Strategy</h1><div style="white-space:pre-wrap;line-height:1.6;font-size:0.95rem;background:rgba(255,255,255,0.05);padding:20px;border-radius:12px;">${content}</div></div>`);
});

app.get('/api/proposal', (req, res) => {
    const content = fs.readFileSync(path.join(__dirname, 'PROPOSAL_TEMPLATE.md'), 'utf8');
    res.send(`<div style="color:var(--text);font-family:inherit;"><h1 style="color:var(--warning)">Pitch Template</h1><div style="white-space:pre-wrap;line-height:1.6;font-size:0.95rem;background:rgba(255,255,255,0.05);padding:20px;border-radius:12px;border:1px dashed var(--warning)">${content}</div></div>`);
});

// ===== CLIENT REPORT API =====
app.get('/api/report/:targetId', (req, res) => {
    const targetId = req.params.targetId;
    const target = getAllTargets().find(t => t.id === targetId);

    if (!target) {
        return res.status(404).send('<h1>Site not found</h1>');
    }

    // Get audit data for this target
    const allData = getAllAuditData();
    const targetData = allData.filter(d => d.targetId === targetId);

    if (targetData.length === 0) {
        return res.status(404).send('<h1>No audit data available. Please run a scan first.</h1>');
    }

    const latestAudit = targetData[0]; // Most recent audit
    const historicalData = targetData.slice(1); // Previous audits for trend analysis

    // Run the enhanced analysis
    const analysis = analyzeMetrics(latestAudit.scores, historicalData);

    // Generate enhanced recommendations
    const recommendations = generateRecommendations(latestAudit.scores, latestAudit.opportunities || [], analysis);

    // Generate the professional report
    const reportHtml = generateDetailedReport(target, latestAudit, analysis, recommendations);

    res.setHeader('Content-Type', 'text/html');
    res.send(reportHtml);
});

// Generate and download report as file
app.get('/api/report/:targetId/download', (req, res) => {
    const targetId = req.params.targetId;
    const target = getAllTargets().find(t => t.id === targetId);

    if (!target) {
        return res.status(404).json({ error: 'Site not found' });
    }

    const allData = getAllAuditData();
    const targetData = allData.filter(d => d.targetId === targetId);

    if (targetData.length === 0) {
        return res.status(404).json({ error: 'No audit data available' });
    }

    const latestAudit = targetData[0];
    const historicalData = targetData.slice(1);
    const analysis = analyzeMetrics(latestAudit.scores, historicalData);
    const recommendations = generateRecommendations(latestAudit.scores, latestAudit.opportunities || [], analysis);
    const reportHtml = generateDetailedReport(target, latestAudit, analysis, recommendations);

    const filename = `${target.name.replace(/[^a-z0-9]/gi, '_')}_Health_Report_${new Date().toISOString().split('T')[0]}.html`;

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(reportHtml);
});

// API to get analysis data as JSON
app.get('/api/analysis/:targetId', (req, res) => {
    const targetId = req.params.targetId;
    const target = getAllTargets().find(t => t.id === targetId);

    if (!target) {
        return res.status(404).json({ error: 'Site not found' });
    }

    const allData = getAllAuditData();
    const targetData = allData.filter(d => d.targetId === targetId);

    if (targetData.length === 0) {
        return res.status(404).json({ error: 'No audit data available' });
    }

    const latestAudit = targetData[0];
    const historicalData = targetData.slice(1);
    const analysis = analyzeMetrics(latestAudit.scores, historicalData);
    const recommendations = generateRecommendations(latestAudit.scores, latestAudit.opportunities || [], analysis);

    res.json({
        target,
        audit: latestAudit,
        analysis,
        recommendations,
        generatedAt: new Date().toISOString()
    });
});

// ===== MAIN DASHBOARD =====
app.get('/', (req, res) => {
    res.send(getDashboardHTML());
});

// ===== LOGIN PAGE HTML =====
function getLoginPage() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login | Maintenance OS</title>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; }
        :root { --bg: #030712; --surface: #0f172a; --accent: #6366f1; --text: #f8fafc; --text-muted: #94a3b8; --danger: #ef4444; }
        body { font-family: 'Plus Jakarta Sans', sans-serif; background: var(--bg); color: var(--text); margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
        .login-card { background: var(--surface); padding: 48px; border-radius: 24px; width: 100%; max-width: 400px; border: 1px solid #1e293b; }
        .logo { font-size: 1.8rem; font-weight: 800; text-align: center; margin-bottom: 32px; background: linear-gradient(to right, #818cf8, #c084fc); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .form-group { margin-bottom: 20px; }
        label { display: block; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 8px; }
        input { width: 100%; padding: 14px 16px; border-radius: 12px; border: 1px solid #334155; background: var(--bg); color: var(--text); font-size: 1rem; font-family: inherit; }
        input:focus { outline: none; border-color: var(--accent); }
        .btn { width: 100%; padding: 14px; border-radius: 12px; background: var(--accent); color: white; font-weight: 700; font-size: 1rem; border: none; cursor: pointer; font-family: inherit; }
        .btn:hover { opacity: 0.9; }
        .error { color: var(--danger); font-size: 0.85rem; margin-top: 16px; text-align: center; display: none; }
        .hint { color: var(--text-muted); font-size: 0.75rem; margin-top: 24px; text-align: center; }
    </style>
</head>
<body>
    <div class="login-card">
        <div class="logo">🛡️ Maintenance OS</div>
        <form id="loginForm">
            <div class="form-group">
                <label>Username</label>
                <input type="text" name="username" required autocomplete="username">
            </div>
            <div class="form-group">
                <label>Password</label>
                <input type="password" name="password" required autocomplete="current-password">
            </div>
            <button type="submit" class="btn">Sign In</button>
            <div class="error" id="error">Invalid credentials</div>
        </form>
        <div class="hint">Demo: admin / maintenance123</div>
    </div>
    <script>
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.target;
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: form.username.value, password: form.password.value })
            });
            if (res.ok) { window.location.href = '/'; }
            else { document.getElementById('error').style.display = 'block'; }
        });
    </script>
</body>
</html>`;
}

// ===== DASHBOARD HTML =====
function getDashboardHTML() {
    const allData = getAllAuditData();
    const latestReports = getLatestReports();
    const allTargets = getAllTargets();
    const allClientsData = getAllClients();

    const clients = allClientsData.map(client => {
        const clientTargets = allTargets.filter(t => t.clientId === client.id).map(t => {
            const history = allData.filter(d => d.targetId === t.id);
            return { ...t, latest: history[0], history };
        });
        return { ...client, targets: clientTargets };
    }).filter(c => c.targets.length > 0);

    const totalOpportunities = latestReports.reduce((acc, r) => acc + (r.opportunities?.length || 0), 0);

    // Calculate revenue
    let totalRevMin = 0, totalRevMax = 0;
    const allOpps = [];
    latestReports.forEach(r => {
        const target = allTargets.find(t => t.id === r.targetId);
        (r.opportunities || []).forEach(opp => {
            const value = config.revenue.painPointValues[opp] || { min: 500, max: 1000, priority: 'medium' };
            totalRevMin += value.min;
            totalRevMax += value.max;
            allOpps.push({ site: target?.name, type: opp, ...value });
        });
    });

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Maintenance OS | Command Center</title>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * { box-sizing: border-box; }
        :root { --bg: #030712; --surface: #0f172a; --surface-bright: #1e293b; --accent: #6366f1; --accent-glow: rgba(99, 102, 241, 0.4); --success: #10b981; --warning: #f59e0b; --danger: #ef4444; --text: #f8fafc; --text-muted: #94a3b8; }
        :root.light { --bg: #f8fafc; --surface: #ffffff; --surface-bright: #f1f5f9; --text: #0f172a; --text-muted: #64748b; }
        body { font-family: 'Plus Jakarta Sans', sans-serif; background: var(--bg); color: var(--text); margin: 0; display: flex; min-height: 100vh; transition: all 0.3s; }
        .sidebar { width: 280px; background: var(--surface); border-right: 1px solid #1e293b; padding: 32px 20px; position: fixed; height: 100vh; display: flex; flex-direction: column; z-index: 100; overflow-y: auto; }
        .main-content { margin-left: 280px; padding: 40px 60px; width: calc(100% - 280px); }
        .logo { font-size: 1.4rem; font-weight: 800; margin-bottom: 32px; background: linear-gradient(to right, #818cf8, #c084fc); -webkit-background-clip: text; -webkit-text-fill-color: transparent; display: flex; align-items: center; gap: 10px; }
        .nav-group { margin-bottom: 24px; }
        .nav-label { font-size: 0.65rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 10px; }
        .nav-btn { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 10px; color: var(--text); text-decoration: none; transition: all 0.2s; border: 1px solid transparent; background: none; width: 100%; cursor: pointer; font-family: inherit; font-size: 0.85rem; text-align: left; }
        .nav-btn:hover { background: var(--surface-bright); }
        .nav-btn.active { background: var(--surface-bright); border-color: rgba(99,102,241,0.3); color: var(--accent); }
        .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 32px; }
        .stat-card { background: var(--surface); border: 1px solid #1e293b; border-radius: 16px; padding: 20px; }
        .stat-label { font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
        .stat-value { font-size: 2rem; font-weight: 800; margin-top: 4px; }
        .stat-value.success { color: var(--success); }
        .stat-value.warning { color: var(--warning); }
        .stat-value.danger { color: var(--danger); }
        .ledger-card { background: linear-gradient(135deg, rgba(99,102,241,0.1), rgba(192,132,252,0.1)); border: 1px solid rgba(99,102,241,0.2); border-radius: 20px; padding: 24px; margin-bottom: 32px; }
        .ledger-table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        .ledger-table th { text-align: left; font-size: 0.65rem; color: var(--text-muted); padding: 8px 12px; text-transform: uppercase; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .ledger-table td { padding: 12px; font-size: 0.85rem; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .priority-tag { padding: 3px 10px; border-radius: 20px; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; }
        .priority-critical { background: rgba(239,68,68,0.2); color: #ef4444; }
        .priority-high { background: rgba(245,158,11,0.2); color: #f59e0b; }
        .priority-medium { background: rgba(99,102,241,0.2); color: #6366f1; }
        .site-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 20px; }
        .card { background: var(--surface); border: 1px solid #1e293b; border-radius: 20px; padding: 20px; transition: all 0.3s; }
        .card:hover { transform: translateY(-4px); border-color: var(--accent); box-shadow: 0 20px 40px rgba(0,0,0,0.3); }
        .btn { padding: 10px 18px; border-radius: 10px; font-weight: 600; font-size: 0.8rem; cursor: pointer; transition: all 0.2s; border: none; font-family: inherit; display: inline-flex; align-items: center; justify-content: center; gap: 6px; }
        .btn-primary { background: var(--accent); color: white; }
        .btn-outline { background: transparent; border: 1px solid #334155; color: var(--text); }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .chart-container { background: var(--surface); border: 1px solid #1e293b; border-radius: 16px; padding: 20px; margin-bottom: 32px; }
        .toast { position: fixed; bottom: 40px; right: 40px; background: var(--surface-bright); padding: 16px 24px; border-radius: 12px; border-left: 4px solid var(--accent); box-shadow: 0 20px 40px rgba(0,0,0,0.4); transform: translateY(100px); transition: transform 0.3s; z-index: 1000; }
        .toast.show { transform: translateY(0); }
        .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px); z-index: 200; align-items: center; justify-content: center; }
        .modal-content { background: var(--surface); width: 90%; max-width: 800px; max-height: 80vh; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1); padding: 32px; overflow-y: auto; position: relative; }
        .theme-toggle { position: fixed; top: 20px; right: 20px; background: var(--surface); border: 1px solid #334155; padding: 10px 14px; border-radius: 10px; cursor: pointer; z-index: 50; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        .pulse { animation: pulse 2s ease-in-out infinite; }
        .score-gauge { width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.1rem; position: relative; }
        .score-gauge::before { content: ''; position: absolute; inset: 0; border-radius: 50%; border: 4px solid currentColor; opacity: 0.2; }
        .user-menu { margin-top: auto; padding-top: 20px; border-top: 1px solid #1e293b; }
        @media (max-width: 1200px) { .stats-row { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 768px) { .sidebar { display: none; } .main-content { margin-left: 0; padding: 20px; width: 100%; } .stats-row { grid-template-columns: 1fr; } .site-grid { grid-template-columns: 1fr; } }
    </style>
</head>
<body>
    <button class="theme-toggle" onclick="toggleTheme()">🌓</button>
    
    <div class="sidebar">
        <div class="logo">🛡️ Maintenance OS</div>
        <div class="nav-group">
            <div class="nav-label">Dashboard</div>
            <button class="nav-btn active" onclick="scrollTo('stats')">📊 Overview</button>
            <button class="nav-btn" onclick="scrollTo('revenue-ledger')">💰 Revenue Ledger</button>
            <button class="nav-btn" onclick="scrollTo('trends')">📈 Trends</button>
        </div>
        <div class="nav-group">
            <div class="nav-label">Monetization</div>
            <button class="nav-btn" onclick="openModal('strategy')">📄 Client Strategy</button>
            <button class="nav-btn" onclick="openModal('proposal')">✅ Pitch Templates</button>
        </div>
        <div class="nav-group">
            <div class="nav-label">Actions</div>
            <button class="nav-btn" onclick="openAddSiteModal()" style="background: linear-gradient(135deg, var(--accent), #a855f7); color: white;">➕ Quick Add Site</button>
            <button class="nav-btn" onclick="runAllAudits()" id="btn-all">🔄 Global Scan</button>
            <button class="nav-btn" onclick="downloadCSV()">📥 Export CSV</button>
            <button class="nav-btn" onclick="downloadJSON()">📦 Export JSON</button>
        </div>
        <div class="user-menu">
            <button class="nav-btn" onclick="logout()">🚪 Logout</button>
        </div>
    </div>

    <div class="main-content">
        <header style="margin-bottom: 32px;">
            <h1 style="font-size: 2.2rem; margin: 0; font-weight: 800;">System Command</h1>
            <p style="color: var(--text-muted); margin-top: 6px;">Maximize client value through proactive performance guarding.</p>
        </header>

        <div id="stats" class="stats-row">
            <div class="stat-card">
                <div class="stat-label">Sites Monitored</div>
                <div class="stat-value">${allTargets.length}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Active Leads</div>
                <div class="stat-value warning">${totalOpportunities}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Est. Revenue</div>
                <div class="stat-value success">£${totalRevMin.toLocaleString()}</div>
                <div style="font-size: 0.7rem; color: var(--text-muted);">to £${totalRevMax.toLocaleString()}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">System Health</div>
                <div class="stat-value ${latestReports.every(r => r.uptime?.status === 'UP') ? 'success' : 'danger'}">${latestReports.filter(r => r.uptime?.status === 'UP').length}/${latestReports.length}</div>
            </div>
        </div>

        <div id="revenue-ledger" class="ledger-card">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                <div>
                    <h2 style="margin: 0; font-size: 1.2rem;">💰 Revenue Ledger</h2>
                    <p style="margin: 4px 0 0; font-size: 0.8rem; color: var(--text-muted);">Actionable pain points with estimated values</p>
                </div>
                <div style="font-size: 1.5rem; font-weight: 800; color: var(--success);">£${totalRevMin.toLocaleString()} - £${totalRevMax.toLocaleString()}</div>
            </div>
            <table class="ledger-table">
                <thead><tr><th>Site</th><th>Opportunity</th><th>Est. Value</th><th>Priority</th></tr></thead>
                <tbody>
                    ${allOpps.length > 0 ? allOpps.map(opp => `
                        <tr>
                            <td style="font-weight: 600;">${opp.site}</td>
                            <td>${opp.type}</td>
                            <td style="color: var(--success); font-weight: 700;">£${opp.min} - £${opp.max}</td>
                            <td><span class="priority-tag priority-${opp.priority}">${opp.priority}</span></td>
                        </tr>
                    `).join('') : '<tr><td colspan="4" style="text-align:center; color: var(--text-muted); padding: 32px;">No pain points detected. Run a scan to identify opportunities.</td></tr>'}
                </tbody>
            </table>
        </div>

        <div id="trends" class="chart-container">
            <h3 style="margin: 0 0 16px;">📈 Performance Trends</h3>
            <canvas id="trendsChart" height="100"></canvas>
        </div>

        ${clients.map(client => `
            <div style="margin-bottom: 40px;">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                    <h2 style="margin: 0; font-size: 1.3rem;">${client.name}</h2>
                    <span style="background: rgba(99,102,241,0.15); color: var(--accent); padding: 4px 12px; border-radius: 20px; font-size: 0.7rem; font-weight: 700;">${client.tier}</span>
                </div>
                <div class="site-grid">
                    ${client.targets.map(site => `
                        <div class="card">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
                                <div>
                                    <h3 style="margin: 0; font-size: 1rem;">${site.name}</h3>
                                    <p style="margin: 2px 0 0; color: var(--text-muted); font-size: 0.75rem;">${site.type}</p>
                                </div>
                                <div style="display: flex; align-items: center; gap: 6px;">
                                    <div style="width: 8px; height: 8px; border-radius: 50%; background: ${site.latest?.uptime.status === 'UP' ? 'var(--success)' : 'var(--danger)'};"></div>
                                    <span style="font-size: 0.7rem; font-weight: 700;">${site.latest?.uptime.status || 'PENDING'}</span>
                                </div>
                            </div>
                            <div style="height: 120px; background: #1e293b; border-radius: 10px; margin-bottom: 16px; overflow: hidden;">
                                ${site.latest ? `<img src="${site.latest.screenshot}" style="width: 100%; height: 100%; object-fit: cover; object-position: top;" alt="Snapshot">` : '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);font-size:0.8rem;">Scan required</div>'}
                            </div>
                            <div style="display: flex; gap: 8px; margin-bottom: 16px;">
                                ${['performance', 'accessibility', 'seo'].map(metric => {
        const score = site.latest?.scores[metric]?.toFixed(0) || '--';
        const color = score >= 90 ? 'var(--success)' : score >= 50 ? 'var(--warning)' : 'var(--danger)';
        return `<div style="flex:1; background: var(--bg); padding: 8px; border-radius: 10px; text-align: center; border: 1px solid #1e293b;">
                                        <span style="display: block; font-size: 1rem; font-weight: 800; color: ${color};">${score}</span>
                                        <span style="font-size: 0.55rem; color: var(--text-muted); text-transform: uppercase;">${metric.slice(0, 4)}</span>
                                    </div>`;
    }).join('')}
                            </div>
                            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                                <button class="btn btn-primary" style="flex: 1; min-width: 70px;" onclick="runOneAudit('${site.id}')" id="btn-${site.id}">🔄 Scan</button>
                                <a href="${site.latest ? `/reports/${site.latest.filename}` : '#'}" target="_blank" class="btn btn-outline" style="flex: 1; min-width: 70px; text-decoration: none;">📊 Raw</a>
                                <a href="${site.latest ? `/api/report/${site.id}` : '#'}" target="_blank" class="btn btn-outline" style="flex: 1; min-width: 90px; text-decoration: none; background: linear-gradient(135deg, rgba(99,102,241,0.1), rgba(168,85,247,0.1)); border-color: var(--accent);">📋 Client Report</a>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('')}
    </div>

    <div id="modal" class="modal">
        <div class="modal-content">
            <button onclick="closeModal()" style="position: absolute; top: 16px; right: 16px; background: none; border: none; color: var(--text); cursor: pointer; font-size: 1.2rem;">✕</button>
            <div id="modal-body"></div>
        </div>
    </div>

    <div id="toast" class="toast">Action completed</div>

    <script>
        // Theme toggle
        function toggleTheme() {
            document.documentElement.classList.toggle('light');
            localStorage.setItem('theme', document.documentElement.classList.contains('light') ? 'light' : 'dark');
        }
        if (localStorage.getItem('theme') === 'light') document.documentElement.classList.add('light');

        // Toast
        function showToast(msg) {
            const toast = document.getElementById('toast');
            toast.innerText = msg;
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 3000);
        }

        // Scroll
        function scrollTo(id) { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); }

        // Modal
        async function openModal(type) {
            const res = await fetch('/api/' + type);
            document.getElementById('modal-body').innerHTML = await res.text();
            document.getElementById('modal').style.display = 'flex';
        }
        function closeModal() { document.getElementById('modal').style.display = 'none'; }

        // Audits
        async function runAllAudits() {
            const btn = document.getElementById('btn-all');
            btn.disabled = true;
            btn.innerHTML = '⏳ Running...';
            await fetch('/api/audit/all', { method: 'POST' });
            showToast('✅ Global scan complete!');
            setTimeout(() => location.reload(), 1500);
        }

        async function runOneAudit(id) {
            const btn = document.getElementById('btn-' + id);
            btn.disabled = true;
            btn.innerHTML = '⏳...';
            await fetch('/api/audit/' + id, { method: 'POST' });
            showToast('✅ Audit complete!');
            setTimeout(() => location.reload(), 1000);
        }

        // Downloads
        function downloadCSV() { window.location.href = '/api/data?format=csv'; }
        function downloadJSON() {
            fetch('/api/data').then(r => r.json()).then(data => {
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = 'maintenance_data.json';
                a.click();
            });
        }

        // Logout
        async function logout() {
            await fetch('/api/logout', { method: 'POST' });
            window.location.href = '/login';
        }

        // Quick Add Site Modal
        function openAddSiteModal() {
            document.getElementById('modal-body').innerHTML = \`
                <h2 style="margin: 0 0 8px; color: var(--accent);">➕ Quick Add Site</h2>
                <p style="color: var(--text-muted); margin: 0 0 24px; font-size: 0.9rem;">Just paste a URL and we'll add it to your monitoring dashboard.</p>
                
                <form id="addSiteForm" style="display: flex; flex-direction: column; gap: 16px;">
                    <div>
                        <label style="display: block; font-size: 0.8rem; color: var(--text-muted); margin-bottom: 6px;">Website URL *</label>
                        <input type="url" name="url" placeholder="https://example.com" required 
                            style="width: 100%; padding: 14px 16px; border-radius: 12px; border: 1px solid #334155; background: var(--bg); color: var(--text); font-size: 1rem; font-family: inherit;">
                    </div>
                    
                    <div>
                        <label style="display: block; font-size: 0.8rem; color: var(--text-muted); margin-bottom: 6px;">Client Name (optional)</label>
                        <input type="text" name="clientName" placeholder="e.g., Acme Healthcare" 
                            style="width: 100%; padding: 14px 16px; border-radius: 12px; border: 1px solid #334155; background: var(--bg); color: var(--text); font-size: 1rem; font-family: inherit;">
                        <p style="font-size: 0.7rem; color: var(--text-muted); margin: 6px 0 0;">Leave blank to add to "Quick Add Sites" group</p>
                    </div>
                    
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <input type="checkbox" name="runAudit" id="runAuditCheck" checked style="width: 18px; height: 18px;">
                        <label for="runAuditCheck" style="font-size: 0.85rem; color: var(--text);">Run initial scan after adding</label>
                    </div>
                    
                    <div style="display: flex; gap: 12px; margin-top: 8px;">
                        <button type="submit" class="btn btn-primary" style="flex: 1; padding: 14px;" id="addSiteBtn">
                            Add Site
                        </button>
                        <button type="button" onclick="closeModal()" class="btn btn-outline" style="flex: 1; padding: 14px;">
                            Cancel
                        </button>
                    </div>
                </form>
                
                <div id="addSiteError" style="color: var(--danger); font-size: 0.85rem; margin-top: 16px; display: none;"></div>
            \`;
            document.getElementById('modal').style.display = 'flex';
            
            document.getElementById('addSiteForm').addEventListener('submit', handleAddSite);
        }
        
        async function handleAddSite(e) {
            e.preventDefault();
            const form = e.target;
            const btn = document.getElementById('addSiteBtn');
            const errorDiv = document.getElementById('addSiteError');
            
            btn.disabled = true;
            btn.innerHTML = '⏳ Adding...';
            errorDiv.style.display = 'none';
            
            try {
                const res = await fetch('/api/sites/add', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        url: form.url.value,
                        clientName: form.clientName.value || null,
                        runAudit: form.runAudit.checked
                    })
                });
                
                const data = await res.json();
                
                if (!res.ok) {
                    throw new Error(data.error || 'Failed to add site');
                }
                
                showToast('✅ Site added: ' + data.site.name);
                closeModal();
                setTimeout(() => location.reload(), 1000);
                
            } catch (err) {
                errorDiv.textContent = err.message;
                errorDiv.style.display = 'block';
                btn.disabled = false;
                btn.innerHTML = 'Add Site';
            }
        }
        
        async function deleteSite(siteId, siteName) {
            if (!confirm('Delete "' + siteName + '" from monitoring?')) return;
            
            try {
                const res = await fetch('/api/sites/' + siteId, { method: 'DELETE' });
                const data = await res.json();
                
                if (!res.ok) throw new Error(data.error);
                
                showToast('🗑️ Site removed');
                location.reload();
            } catch (err) {
                showToast('❌ ' + err.message);
            }
        }

        // Trends Chart
        async function loadTrendsChart() {
            const targets = ${JSON.stringify(allTargets.map(t => ({ id: t.id, name: t.name })))};
            const datasets = [];
            const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6'];
            
            for (let i = 0; i < targets.length; i++) {
                const res = await fetch('/api/trends/' + targets[i].id);
                const data = await res.json();
                if (data.length > 0) {
                    datasets.push({
                        label: targets[i].name,
                        data: data.map(d => ({ x: new Date(d.timestamp), y: d.scores.performance })),
                        borderColor: colors[i % colors.length],
                        backgroundColor: colors[i % colors.length] + '33',
                        fill: false,
                        tension: 0.4
                    });
                }
            }

            if (datasets.length > 0) {
                new Chart(document.getElementById('trendsChart'), {
                    type: 'line',
                    data: { datasets },
                    options: {
                        responsive: true,
                        plugins: { legend: { labels: { color: getComputedStyle(document.documentElement).getPropertyValue('--text') } } },
                        scales: {
                            x: { type: 'time', time: { unit: 'day' }, grid: { color: '#1e293b' }, ticks: { color: '#94a3b8' } },
                            y: { min: 0, max: 100, grid: { color: '#1e293b' }, ticks: { color: '#94a3b8' } }
                        }
                    }
                });
            }
        }
        loadTrendsChart();
    </script>
    <script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns"></script>
</body>
</html>`;
}

// ===== START SERVER =====
app.listen(PORT, () => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  🛡️  MAINTENANCE OS v2.0');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  ✅ Dashboard: http://localhost:${PORT}`);
    console.log(`  🔐 Auth: ${config.auth.enabled ? 'Enabled' : 'Disabled'}`);
    console.log(`  📧 Email: ${config.email.enabled ? 'Enabled' : 'Disabled'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Initialize scheduler if this is the main process
    try { initScheduler(); } catch (e) { console.log('Scheduler will run separately'); }
});
