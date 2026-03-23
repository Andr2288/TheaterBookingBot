const db = require('../config/database');

async function createBooking(userId, showId, row, seat, show, zone) {
    try {
        const existing = await db.query(
            'SELECT id FROM bookings WHERE show_id = ? AND seat_row = ? AND seat_number = ?',
            [showId, row, seat]
        );

        if (existing.length > 0) {
            return { success: false, error: 'Місце вже заброньовано' };
        }

        const price = calculatePrice(show, row);

        await db.query(
            'INSERT INTO bookings (user_id, show_id, seat_row, seat_number, price) VALUES (?, ?, ?, ?, ?)',
            [userId, showId, row, seat, price]
        );

        await db.query(
            'INSERT INTO user_interactions (user_id, show_id, interaction_type) VALUES (?, ?, ?)',
            [userId, showId, 'attempt_book']
        );

        return { success: true, price };
    } catch (error) {
        console.error('Booking error:', error);
        return { success: false, error: 'Помилка бронювання' };
    }
}

function calculatePrice(show, row) {
    if (show.scene_type === 'chamber') {
        if (row === 1) return parseFloat(show.price_high);
        if (row <= 3) return parseFloat(show.price_mid);
        return parseFloat(show.price_low);
    } else {
        if (row <= 3) return parseFloat(show.price_high);
        if (row <= 7) return parseFloat(show.price_mid);
        return parseFloat(show.price_low);
    }
}

async function getUserBookings(userId) {
    try {
        const bookings = await db.query(`
            SELECT 
                b.id as booking_id,
                b.seat_row,
                b.seat_number,
                b.price,
                b.created_at as booking_date,
                s.title as show_title,
                s.date as show_date,
                s.genre,
                s.scene_type,
                s.poster
            FROM bookings b
            JOIN shows s ON b.show_id = s.id
            WHERE b.user_id = ?
            ORDER BY s.date ASC
        `, [userId]);

        return bookings;
    } catch (error) {
        console.error('Error getting bookings:', error);
        return [];
    }
}

async function cancelBooking(bookingId, userId) {
    try {
        const booking = await db.query(
            'SELECT show_id, created_at FROM bookings WHERE id = ? AND user_id = ?',
            [bookingId, userId]
        );

        if (booking.length === 0) {
            return { success: false, error: 'Бронювання не знайдено' };
        }

        await db.query(
            'DELETE FROM bookings WHERE show_id = ? AND user_id = ? AND created_at = ?',
            [booking[0].show_id, userId, booking[0].created_at]
        );

        return { success: true };
    } catch (error) {
        console.error('Cancel booking error:', error);
        return { success: false, error: 'Помилка скасування' };
    }
}

module.exports = {
    createBooking,
    getUserBookings,
    cancelBooking
};