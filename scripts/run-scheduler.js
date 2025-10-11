const cron = require('node-cron');
const { exec } = require('child_process');

// Configuration
const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';
const CRON_SECRET = process.env.CRON_SECRET;

// Function to call the cron endpoint
async function callCronEndpoint(path) {
  return new Promise((resolve, reject) => {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (CRON_SECRET) {
      headers['Authorization'] = `Bearer ${CRON_SECRET}`;
    }

    const curlCommand = `curl -X POST ${BASE_URL}${path} -H 'Content-Type: application/json' ${CRON_SECRET ? `-H 'Authorization: Bearer ${CRON_SECRET}'` : ''}`;

    console.log(`🚀 Executing: ${curlCommand}`);

    exec(curlCommand, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Error calling ${path}:`, error);
        reject(error);
        return;
      }

      if (stderr) {
        console.error(`⚠️  Stderr: ${stderr}`);
      }

      console.log(`✅ Response from ${path}:`);
      console.log(stdout);
      resolve(stdout);
    });
  });
}

// Schedule tasks
console.log('🕐 Starting local cron job scheduler...');
console.log(`📍 Base URL: ${BASE_URL}`);
console.log(`🔑 CRON_SECRET: ${CRON_SECRET ? 'Set' : 'Not set'}`);

// Daily job at 8 AM (you can change this for testing)
cron.schedule('0 8 * * *', async () => {
  console.log('\n🌅 Running daily cron job at 8:00 AM');
  try {
    await callCronEndpoint('/api/cron/daily');
  } catch (error) {
    console.error('❌ Daily cron job failed:', error);
  }
});

// Run every 6 hours for CUSTOM frequency
cron.schedule('0 */6 * * *', async () => {
  console.log('\n⏰ Running 6-hourly cron job');
  try {
    await callCronEndpoint('/api/cron/run-schedules');
  } catch (error) {
    console.error('❌ 6-hourly cron job failed:', error);
  }
});

// For testing: run every minute (comment out in production)
// cron.schedule('* * * * *', async () => {
//   console.log('\n🧪 Running test cron job (every minute)');
//   try {
//     await callCronEndpoint('/api/cron/daily');
//   } catch (error) {
//     console.error('❌ Test cron job failed:', error);
//   }
// });

console.log('\n⏳ Scheduler is running...');
console.log('📅 Scheduled jobs:');
console.log('  - Daily at 8:00 AM: /api/cron/daily');
console.log('  - Every 6 hours: /api/cron/run-schedules');
console.log('\n💡 To test manually, run:');
console.log(`   node ${__filename}`);
console.log('\n🛑 Press Ctrl+C to stop');

// Keep the process running
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping scheduler...');
  process.exit(0);
});

// Optional: Run once immediately for testing
if (process.argv.includes('--run-now')) {
  console.log('\n🚀 Running cron jobs immediately for testing...');
  (async () => {
    try {
      console.log('Testing daily endpoint...');
      await callCronEndpoint('/api/cron/daily');

      console.log('\nTesting run-schedules endpoint...');
      await callCronEndpoint('/api/cron/run-schedules');
    } catch (error) {
      console.error('❌ Test run failed:', error);
    }
    process.exit(0);
  })();
}