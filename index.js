import { config } from './config.js';
import { runAudit } from './engine.js';

export async function runAllAudits() {
    console.log('\n--- STARTING GLOBAL MAINTENANCE SCAN ---');
    const results = [];
    for (const target of config.targets) {
        const result = await runAudit(target, config.audit);
        results.push(result);
    }
    return results;
}

// Support running directly via CLI
if (import.meta.url === `file://${process.argv[1]}`) {
    runAllAudits().then(results => {
        console.log('\n--- SCAN COMPLETE ---');
        process.exit(0);
    }).catch(err => {
        console.error('CRITICAL SYSTEM FAILURE:', err);
        process.exit(1);
    });
}

