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

function zoneSelection(show, availability) {
    const buttons = [];

    const zones = {
        high: { emoji: '🔴', price: show.price_high },
        mid: { emoji: '🟡', price: show.price_mid },
        low: { emoji: '🟢', price: show.price_low }
    };

    for (const [zone, data] of Object.entries(zones)) {
        const avail = availability[zone];
        if (avail.available > 0) {
            buttons.push([Markup.button.callback(
                `${data.emoji} ${avail.name} (${data.price} грн) - ${avail.available} вільних`,
                `booking:zone:${zone}`
            )]);
        }
    }

    buttons.push([Markup.button.callback('❌ Скасувати', 'booking:cancel')]);

    return Markup.inlineKeyboard(buttons);
}

function backToZones() {
    return Markup.inlineKeyboard([
        [Markup.button.callback('◀️ Назад до вибору зони', 'booking:back_to_zones')],
        [Markup.button.callback('❌ Скасувати бронювання', 'booking:cancel')]
    ]);
}

function confirmBooking() {
    return Markup.inlineKeyboard([
        [Markup.button.callback('✅ Підтвердити', 'booking:confirm')],
        [Markup.button.callback('◀️ Змінити місце', 'booking:back_to_zones')],
        [Markup.button.callback('❌ Скасувати', 'booking:cancel')]
    ]);
}

function bookingActions(bookingId, showDate) {
    const canCancel = new Date(showDate) > new Date();

    const buttons = [];

    if (canCancel) {
        buttons.push([Markup.button.callback(
            '❌ Скасувати бронювання',
            `cancel_booking:${bookingId}`
        )]);
    }

    return Markup.inlineKeyboard(buttons);
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
            `settings:genre:${genre}`
        );
    });

    // Розбиваємо по 2 в ряд
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

function onboardingPeriods(selected = []) {
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

function onboardingScene() {
    return Markup.inlineKeyboard([
        [Markup.button.callback('🏛 Основна сцена', 'settings:scene:main')],
        [Markup.button.callback('🎪 Камерна сцена', 'settings:scene:chamber')],
        [Markup.button.callback('🤷 Без різниці', 'settings:scene:any')],
        [Markup.button.callback('Пропустити ⏭', 'settings:skip')]
    ]);
}

function settingsMenu() {
    return Markup.inlineKeyboard([
        [Markup.button.callback('✏️ Редагувати налаштування', 'settings:edit_preferences')]
    ]);
}

module.exports = {
    mainMenu,
    authMenu,
    afishaList,
    showActions,
    zoneSelection,
    backToZones,
    confirmBooking,
    bookingActions,
    onboardingGenres,
    onboardingPeriods,
    onboardingScene,
    settingsMenu
};