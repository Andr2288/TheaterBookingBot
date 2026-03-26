const { Markup } = require('telegraf');

function mainMenu() {
    return Markup.keyboard([
        ['📅 Афіша', '🎫 Мої бронювання'],
        ['⭐ Рекомендації', '⚙️ Налаштування'],
        ['🚪 Вийти з акаунту']
    ]).resize();
}

function authMenu() {
    return Markup.inlineKeyboard([
        [Markup.button.callback('🔐 Увійти', 'auth:login')]
    ]);
}

function afishaList(shows) {
    const buttons = shows.slice(0, 10).map(show => {
        const date = new Date(show.date).toLocaleDateString('uk-UA', {
            day: 'numeric',
            month: 'short'
        });
        return [Markup.button.callback(
            `${show.title} (${date})`,
            `show:details:${show.id}`
        )];
    });

    return Markup.inlineKeyboard(buttons);
}

function showActions(showId) {
    return Markup.inlineKeyboard([
        [Markup.button.callback('🎫 Забронювати', `show:book:${showId}`)],
        [Markup.button.callback('◀️ Назад до афіші', 'show:back')]
    ]);
}

function rowSelection(show, rowsAvailability, selectedSeats = []) {
    const rows = rowsAvailability
        .filter((rowInfo) => rowInfo.available > 0)
        .map((rowInfo) => [
            Markup.button.callback(
                `Ряд ${rowInfo.row} • ${rowInfo.price} грн • ${rowInfo.available}/${rowInfo.total} вільно`,
                `booking:row:${rowInfo.row}`
            )
        ]);

    if (selectedSeats.length > 0) {
        rows.push([
            Markup.button.callback(`✅ Підтвердити (${selectedSeats.length})`, 'booking:review')
        ]);
        rows.push([
            Markup.button.callback('🗑 Очистити вибір', 'booking:clear')
        ]);
    }

    rows.push([Markup.button.callback('❌ Скасувати', 'booking:cancel')]);

    return Markup.inlineKeyboard(rows);
}

function seatSelection(row, seats, selectedSeats = []) {
    const rows = [];
    let current = [];

    for (const seat of seats) {
        const label = seat.booked
            ? `❌${seat.seat}`
            : seat.selected
                ? `✅${seat.seat}`
                : `${seat.seat}`;

        const callback = seat.booked
            ? 'booking:seat_taken'
            : seat.selected
                ? `booking:remove:${row}:${seat.seat}`
                : `booking:add:${row}:${seat.seat}`;

        current.push(Markup.button.callback(label, callback));

        if (current.length === 5) {
            rows.push(current);
            current = [];
        }
    }

    if (current.length) {
        rows.push(current);
    }

    if (selectedSeats.length > 0) {
        rows.push([
            Markup.button.callback(`✅ Підтвердити (${selectedSeats.length})`, 'booking:review')
        ]);
        rows.push([
            Markup.button.callback('🗑 Очистити вибір', 'booking:clear')
        ]);
    }

    rows.push([
        Markup.button.callback('◀️ Назад до рядів', 'booking:back_to_rows'),
        Markup.button.callback('❌ Скасувати', 'booking:cancel')
    ]);

    return Markup.inlineKeyboard(rows);
}

function reviewBooking() {
    return Markup.inlineKeyboard([
        [Markup.button.callback('✅ Підтвердити бронювання', 'booking:confirm')],
        [Markup.button.callback('◀️ Продовжити вибір місць', 'booking:back_to_rows')],
        [Markup.button.callback('🗑 Очистити вибір', 'booking:clear')],
        [Markup.button.callback('❌ Скасувати', 'booking:cancel')]
    ]);
}

function bookingActions(bookingId, showDate) {
    const canCancel = new Date(showDate) > new Date();
    const buttons = [];

    if (canCancel) {
        buttons.push([
            Markup.button.callback('❌ Скасувати бронювання', `cancel_booking:${bookingId}`)
        ]);
    }

    return buttons.length ? Markup.inlineKeyboard(buttons) : undefined;
}

function onboardingGenres(selected = []) {
    const genres = [
        'Драма', 'Комедія', 'Мюзикл', 'Трагедія',
        'Історична', 'Містика', 'Епос'
    ];

    const buttons = genres.map(genre => {
        const isSelected = selected.includes(genre);
        return Markup.button.callback(
            `${isSelected ? '✅' : '☐'} ${genre}`,
            `onboarding:genre:${genre}`
        );
    });

    const rows = [];
    for (let i = 0; i < buttons.length; i += 2) {
        rows.push(buttons.slice(i, i + 2));
    }

    rows.push([
        Markup.button.callback('Пропустити ⏭', 'onboarding:skip'),
        Markup.button.callback('Далі ➡️', 'onboarding:next:genres')
    ]);

    return Markup.inlineKeyboard(rows);
}

function onboardingPeriods(selected = []) {
    const periods = [
        'Сучасність', 'XX століття', 'XVIII століття',
        'Відродження', 'Середньовіччя', 'Античність'
    ];

    const buttons = periods.map(period => {
        const isSelected = selected.includes(period);
        return Markup.button.callback(
            `${isSelected ? '✅' : '☐'} ${period}`,
            `onboarding:period:${period}`
        );
    });

    const rows = [];
    for (let i = 0; i < buttons.length; i += 2) {
        rows.push(buttons.slice(i, i + 2));
    }

    rows.push([
        Markup.button.callback('Пропустити ⏭', 'onboarding:skip'),
        Markup.button.callback('Далі ➡️', 'onboarding:next:periods')
    ]);

    return Markup.inlineKeyboard(rows);
}

function onboardingScene() {
    return Markup.inlineKeyboard([
        [Markup.button.callback('🏛 Основна сцена', 'onboarding:scene:main')],
        [Markup.button.callback('🎪 Камерна сцена', 'onboarding:scene:chamber')],
        [Markup.button.callback('🤷 Без різниці', 'onboarding:scene:any')],
        [Markup.button.callback('Пропустити ⏭', 'onboarding:skip')]
    ]);
}

function settingsGenres(selected = []) {
    const genres = [
        'Драма', 'Комедія', 'Мюзикл', 'Трагедія',
        'Історична', 'Містика', 'Епос'
    ];

    const buttons = genres.map(genre => {
        const isSelected = selected.includes(genre);
        return Markup.button.callback(
            `${isSelected ? '✅' : '☐'} ${genre}`,
            `settings:genre:${genre}`
        );
    });

    const rows = [];
    for (let i = 0; i < buttons.length; i += 2) {
        rows.push(buttons.slice(i, i + 2));
    }

    rows.push([
        Markup.button.callback('Пропустити ⏭', 'settings:skip'),
        Markup.button.callback('Далі ➡️', 'settings:next:genres')
    ]);

    return Markup.inlineKeyboard(rows);
}

function settingsPeriods(selected = []) {
    const periods = [
        'Сучасність', 'XX століття', 'XVIII століття',
        'Відродження', 'Середньовіччя', 'Античність'
    ];

    const buttons = periods.map(period => {
        const isSelected = selected.includes(period);
        return Markup.button.callback(
            `${isSelected ? '✅' : '☐'} ${period}`,
            `settings:period:${period}`
        );
    });

    const rows = [];
    for (let i = 0; i < buttons.length; i += 2) {
        rows.push(buttons.slice(i, i + 2));
    }

    rows.push([
        Markup.button.callback('Пропустити ⏭', 'settings:skip'),
        Markup.button.callback('Далі ➡️', 'settings:next:periods')
    ]);

    return Markup.inlineKeyboard(rows);
}

function settingsScene(selected) {
    return Markup.inlineKeyboard([
        [Markup.button.callback(`${selected === 'main' ? '✅ ' : ''}🏛 Основна сцена`, 'settings:scene:main')],
        [Markup.button.callback(`${selected === 'chamber' ? '✅ ' : ''}🎪 Камерна сцена`, 'settings:scene:chamber')],
        [Markup.button.callback(`${selected === 'any' ? '✅ ' : ''}🤷 Без різниці`, 'settings:scene:any')],
        [Markup.button.callback('Зберегти ✅', 'settings:save')]
    ]);
}

function settingsMenu() {
    return Markup.inlineKeyboard([
        [Markup.button.callback('✏️ Редагувати вподобання', 'settings:edit')],
        [Markup.button.callback('🗑 Очистити все', 'settings:clear')]
    ]);
}

module.exports = {
    mainMenu,
    authMenu,
    afishaList,
    showActions,
    rowSelection,
    seatSelection,
    reviewBooking,
    bookingActions,
    onboardingGenres,
    onboardingPeriods,
    onboardingScene,
    settingsGenres,
    settingsPeriods,
    settingsScene,
    settingsMenu
};