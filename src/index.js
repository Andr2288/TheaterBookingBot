require('dotenv').config();
const bot = require('./bot');

bot.launch()
    .then(() => {
        console.log('✅ Theater Bot is running!');
        console.log('🎭 RESONANCE Theater Booking Bot');
    })
    .catch((error) => {
        console.error('❌ Bot launch error:', error);
        process.exit(1);
    });

process.once('SIGINT', () => {
    console.log('\n🛑 Stopping bot...');
    bot.stop('SIGINT');
});

process.once('SIGTERM', () => {
    console.log('\n🛑 Stopping bot...');
    bot.stop('SIGTERM');
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled Promise Rejection:', error);
});