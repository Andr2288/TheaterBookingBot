const db = require('../config/database');
const showService = require('./showService');

async function createBooking(userId, showId, seats, show) {
    try {
        if (!Array.isArray(seats) || seats.length === 0) {
            return { success: false, error: 'Оберіть хоча б одне місце' };
        }

        if (seats.length > 6) {
            return { success: false, error: 'Максимум 6 місць за одне бронювання' };
        }

        const normalizedSeats = seats.map((seat) => ({
            row: Number(seat.row),
            seat: Number(seat.seat)
        }));

        const uniqueKeys = new Set();
        for (const seat of normalizedSeats) {
            const validation = showService.validateSeat(show.scene_type, seat.row, seat.seat);
            if (!validation.valid) {
                return { success: false, error: validation.error };
            }

            const key = `${seat.row}:${seat.seat}`;
            if (uniqueKeys.has(key)) {
                return { success: false, error: `Місце ${seat.row}-${seat.seat} обране двічі` };
            }
            uniqueKeys.add(key);
        }

        const result = await db.withTransaction(async (connection) => {
            for (const seat of normalizedSeats) {
                const [existing] = await connection.query(
                    'SELECT id FROM bookings WHERE show_id = ? AND seat_row = ? AND seat_number = ?',
                    [showId, seat.row, seat.seat]
                );

                if (existing.length > 0) {
                    throw new Error(`Місце ${seat.row}-${seat.seat} вже заброньоване`);
                }
            }

            const bookingIds = [];
            let totalPrice = 0;

            for (const seat of normalizedSeats) {
                const price = showService.getSeatPrice(show, seat.row);
                totalPrice += price;

                const [insertResult] = await connection.query(
                    'INSERT INTO bookings (user_id, show_id, seat_row, seat_number, price) VALUES (?, ?, ?, ?, ?)',
                    [userId, showId, seat.row, seat.seat, price]
                );

                if (insertResult && insertResult.insertId) {
                    bookingIds.push(insertResult.insertId);
                }
            }

            await connection.query(
                'INSERT INTO user_interactions (user_id, show_id, interaction_type) VALUES (?, ?, ?)',
                [userId, showId, 'attempt_book']
            );

            return {
                success: true,
                bookingIds,
                bookingId: bookingIds[0] || null,
                totalPrice
            };
        });

        return result;
    } catch (error) {
        console.error('Booking error:', error);
        return { success: false, error: error.message || 'Помилка бронювання' };
    }
}

async function getUserBookings(userId) {
    try {
        const bookings = await db.query(`
            SELECT 
                MIN(b.id) as booking_id,
                b.show_id,
                b.created_at as booking_date,
                s.title as show_title,
                s.date as show_date,
                s.genre,
                s.scene_type,
                s.poster,
                SUM(b.price) as total_price,
                COUNT(*) as seats_count,
                GROUP_CONCAT(CONCAT('Ряд ', b.seat_row, ', місце ', b.seat_number) ORDER BY b.seat_row, b.seat_number SEPARATOR '; ') as seats
            FROM bookings b
            JOIN shows s ON b.show_id = s.id
            WHERE b.user_id = ?
            GROUP BY b.show_id, b.created_at, s.title, s.date, s.genre, s.scene_type, s.poster
            ORDER BY b.created_at DESC
        `, [userId]);

        return bookings.map((booking) => ({
            ...booking,
            booking_id: Number(booking.booking_id),
            show_id: Number(booking.show_id),
            total_price: Number(booking.total_price),
            seats_count: Number(booking.seats_count)
        }));
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