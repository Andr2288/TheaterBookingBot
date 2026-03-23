require('dotenv').config();
const db = require('../config/database');
const bot = require('../bot');
const messages = require('../utils/messages');

async function sendReminders() {
    try {
        console.log('🔔 Checking for reminders...');

        // Знаходимо бронювання на завтра (±2 години від 24 годин)
        const tomorrow = new Date();
        tomorrow.setHours(tomorrow.getHours() + 22); // 22 години від зараз

        const dayAfterTomorrow = new Date();
        dayAfterTomorrow.setHours(dayAfterTomorrow.getHours() + 26); // 26 годин від зараз

        const [bookings] = await db.query(`
            SELECT 
                b.id as booking_id,
                b.seat_row,
                b.seat_number,
                b.price,
                b.user_id,
                u.telegram_id,
                s.title as show_title,
                s.date as show_date
            FROM bookings b
            JOIN users u ON b.user_id = u.id
            JOIN shows s ON b.show_id = s.id
            WHERE s.date BETWEEN ? AND ?
            AND u.telegram_id IS NOT NULL
            AND b.reminder_sent = FALSE
        `, [tomorrow, dayAfterTomorrow]);

        console.log(`📊 Found ${bookings.length} bookings to remind`);

        for (const booking of bookings) {
            try {
                await bot.telegram.sendMessage(
                    booking.telegram_id,
                    messages.reminderMessage(booking),
                    { parse_mode: 'Markdown' }
                );

                // Позначаємо що нагадування відправлено
                await db.query(
                    'UPDATE bookings SET reminder_sent = TRUE WHERE id = ?',
                    [booking.booking_id]
                );

                console.log(`✅ Reminder sent to user ${booking.user_id}`);
            } catch (error) {
                console.error(`❌ Failed to send reminder to user ${booking.user_id}:`, error);
            }
        }

        console.log('✅ Reminders check completed');
    } catch (error) {
        console.error('❌ Reminders job error:', error);
    }
}

// Якщо запущено безпосередньо
if (require.main === module) {
    sendReminders()
        .then(() => {
            console.log('Done');
            process.exit(0);
        })
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = { sendReminders };