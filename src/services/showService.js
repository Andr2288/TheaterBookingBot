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
        return seats;
    } catch (error) {
        console.error('Error getting booked seats:', error);
        return [];
    }
}

function calculateAvailability(sceneType, bookedSeats) {
    const config = sceneType === 'main'
        ? { rows: 10, seatsPerRow: 20 }
        : { rows: 4, seatsPerRow: 10 };

    const zones = sceneType === 'main'
        ? {
            high: { rows: [1, 2, 3], name: 'Ряди 1-3' },
            mid: { rows: [4, 5, 6, 7], name: 'Ряди 4-7' },
            low: { rows: [8, 9, 10], name: 'Ряди 8-10' }
        }
        : {
            high: { rows: [1], name: 'Ряд 1' },
            mid: { rows: [2, 3], name: 'Ряди 2-3' },
            low: { rows: [4], name: 'Ряд 4' }
        };

    const availability = {};

    for (const [zone, data] of Object.entries(zones)) {
        const totalSeats = data.rows.length * config.seatsPerRow;
        const bookedInZone = bookedSeats.filter(seat =>
            data.rows.includes(seat.seat_row)
        ).length;

        availability[zone] = {
            total: totalSeats,
            booked: bookedInZone,
            available: totalSeats - bookedInZone,
            name: data.name
        };
    }

    return availability;
}

function getAvailableSeatsInZone(sceneType, zone, bookedSeats) {
    const config = sceneType === 'main'
        ? { rows: 10, seatsPerRow: 20 }
        : { rows: 4, seatsPerRow: 10 };

    const zoneRows = {
        main: {
            high: [1, 2, 3],
            mid: [4, 5, 6, 7],
            low: [8, 9, 10]
        },
        chamber: {
            high: [1],
            mid: [2, 3],
            low: [4]
        }
    };

    const rows = zoneRows[sceneType][zone];
    const availableSeats = [];

    for (const row of rows) {
        const seatsInRow = [];

        for (let seat = 1; seat <= config.seatsPerRow; seat++) {
            const isBooked = bookedSeats.some(s =>
                s.seat_row === row && s.seat_number === seat
            );

            if (!isBooked) {
                seatsInRow.push(seat);
            }
        }

        if (seatsInRow.length > 0) {
            availableSeats.push({
                row,
                seats: formatSeatRanges(seatsInRow)
            });
        }
    }

    return availableSeats;
}

function formatSeatRanges(seats) {
    if (seats.length === 0) return '';

    const ranges = [];
    let start = seats[0];
    let end = seats[0];

    for (let i = 1; i < seats.length; i++) {
        if (seats[i] === end + 1) {
            end = seats[i];
        } else {
            ranges.push(start === end ? `${start}` : `${start}-${end}`);
            start = seats[i];
            end = seats[i];
        }
    }

    ranges.push(start === end ? `${start}` : `${start}-${end}`);
    return ranges.join(', ');
}

function validateSeat(sceneType, zone, row, seat) {
    const config = sceneType === 'main'
        ? { rows: 10, seatsPerRow: 20 }
        : { rows: 4, seatsPerRow: 10 };

    const zoneRows = {
        main: {
            high: [1, 2, 3],
            mid: [4, 5, 6, 7],
            low: [8, 9, 10]
        },
        chamber: {
            high: [1],
            mid: [2, 3],
            low: [4]
        }
    };

    if (row < 1 || row > config.rows) {
        return { valid: false, error: `Ряд має бути від 1 до ${config.rows}` };
    }

    if (seat < 1 || seat > config.seatsPerRow) {
        return { valid: false, error: `Місце має бути від 1 до ${config.seatsPerRow}` };
    }

    if (!zoneRows[sceneType][zone].includes(row)) {
        return { valid: false, error: `Ряд ${row} не належить до обраної зони` };
    }

    return { valid: true };
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

module.exports = {
    getUpcomingShows,
    getShowById,
    getBookedSeats,
    calculateAvailability,
    getAvailableSeatsInZone,
    validateSeat,
    calculatePrice
};