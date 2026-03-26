const db = require('../config/database');

async function getUpcomingShows() {
    try {
        const shows = await db.query(
            'SELECT * FROM shows WHERE date > NOW() ORDER BY date ASC LIMIT 20'
        );
        return shows;
    } catch (error) {
        console.error('Error getting shows:', error);
        return [];
    }
}

async function getShowById(showId) {
    try {
        const shows = await db.query(
            'SELECT * FROM shows WHERE id = ?',
            [showId]
        );
        return shows.length > 0 ? shows[0] : null;
    } catch (error) {
        console.error('Error getting show:', error);
        return null;
    }
}

async function getBookedSeats(showId) {
    try {
        const seats = await db.query(
            'SELECT seat_row, seat_number FROM bookings WHERE show_id = ?',
            [showId]
        );
        return seats.map((seat) => ({
            seat_row: Number(seat.seat_row),
            seat_number: Number(seat.seat_number)
        }));
    } catch (error) {
        console.error('Error getting booked seats:', error);
        return [];
    }
}

function getSceneConfig(sceneType) {
    return sceneType === 'main'
        ? { rows: 10, seatsPerRow: 20 }
        : { rows: 4, seatsPerRow: 10 };
}

function getSeatPrice(show, row) {
    if (show.scene_type === 'chamber') {
        if (row === 1) return parseFloat(show.price_high);
        if (row <= 3) return parseFloat(show.price_mid);
        return parseFloat(show.price_low);
    }

    if (row <= 3) return parseFloat(show.price_high);
    if (row <= 7) return parseFloat(show.price_mid);
    return parseFloat(show.price_low);
}

function validateSeat(sceneType, row, seat) {
    const config = getSceneConfig(sceneType);

    if (!Number.isInteger(row) || row < 1 || row > config.rows) {
        return { valid: false, error: `Ряд має бути від 1 до ${config.rows}` };
    }

    if (!Number.isInteger(seat) || seat < 1 || seat > config.seatsPerRow) {
        return { valid: false, error: `Місце має бути від 1 до ${config.seatsPerRow}` };
    }

    return { valid: true };
}

function getRowsAvailability(show, bookedSeats) {
    const config = getSceneConfig(show.scene_type);
    const rows = [];

    for (let row = 1; row <= config.rows; row++) {
        const bookedInRow = bookedSeats.filter((seat) => seat.seat_row === row).length;
        rows.push({
            row,
            total: config.seatsPerRow,
            booked: bookedInRow,
            available: config.seatsPerRow - bookedInRow,
            price: getSeatPrice(show, row)
        });
    }

    return rows;
}

function getSeatsInRow(show, row, bookedSeats, selectedSeats = []) {
    const config = getSceneConfig(show.scene_type);
    const seats = [];

    for (let seat = 1; seat <= config.seatsPerRow; seat++) {
        const booked = bookedSeats.some((item) => item.seat_row === row && item.seat_number === seat);
        const selected = selectedSeats.some((item) => item.row === row && item.seat === seat);

        seats.push({ seat, booked, selected });
    }

    return seats;
}

function calculateTotal(show, seats = []) {
    return seats.reduce((sum, seat) => sum + getSeatPrice(show, seat.row), 0);
}

module.exports = {
    getUpcomingShows,
    getShowById,
    getBookedSeats,
    getSceneConfig,
    getSeatPrice,
    getRowsAvailability,
    getSeatsInRow,
    calculateTotal,
    validateSeat
};