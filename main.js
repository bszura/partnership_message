const { Client } = require('discord.js-selfbot-v13');
const express = require('express');
const { createClient } = require('@libsql/client');
const app = express();
const PORT = 8080;

const client = new Client({
  checkUpdate: false,
  readyStatus: false,
  ws: {
    properties: {
      browser: 'Discord iOS',
    }
  }
});

const db = createClient({
  url: process.env.TURSO_URL,
  authToken: process.env.TURSO_TOKEN,
});

async function initDB() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS partnership_reminders (
      user_id TEXT PRIMARY KEY,
      remind_at INTEGER
    )
  `);
}

async function setReminder(userId, remindAt) {
  await db.execute({
    sql: 'INSERT OR REPLACE INTO partnership_reminders (user_id, remind_at) VALUES (?, ?)',
    args: [userId, remindAt],
  });
}

async function deleteReminder(userId) {
  await db.execute({
    sql: 'DELETE FROM partnership_reminders WHERE user_id = ?',
    args: [userId],
  });
}

app.get('/', (req, res) => res.send('Self-bot działa na Render! 🚀'));
app.listen(PORT, () => console.log(`Serwer pingujący działa na porcie ${PORT}`));

const botStartTime = Date.now();

client.once('ready', async () => {
  console.log(`Zalogowano jako ${client.user.tag}!`);
  console.log(`Bot ${client.user.tag} jest gotowy.`);
  await initDB();
  startReminderChecker();
});

// ===================== REKLAMY =====================

const ad1 = `...`;
const ad2 = `...`;
const ad3 = `...`;
const ad4 = `...`;
const ad6 = `...`;
const ad7 = `...`;

const ALL_ADS = [ad1, ad2, ad3, ad4, ad6, ad7];

// ===================== KANAŁY =====================

const PARTNER_CHANNELS = [
  '1487559123166822460',
  '1485664071234621440',
  '1476241698207043636',
  '1455561797821141094',
  '1449144356975149358',
  '1429451429273141251',
  '1296167863551529033',
];

const REMINDER_DELAY = 5 * 24 * 60 * 60 * 1000;
const pendingRenewals = new Map();

// ===================== OCHRONA =====================

const DELAY_MIN = 4000;
const DELAY_MAX = 9000;

function randomDelay() {
  const ms = Math.floor(Math.random() * (DELAY_MAX - DELAY_MIN + 1)) + DELAY_MIN;
  return new Promise(r => setTimeout(r, ms));
}

let messagesSentCount = 0;
const PAUSE_EVERY = 5;
const PAUSE_DURATION = 20000;

async function safeSend(channel, content) {
  messagesSentCount++;

  if (messagesSentCount % PAUSE_EVERY === 0) {
    await new Promise(r => setTimeout(r, PAUSE_DURATION));
  }

  await randomDelay();
  await channel.send(content);
}

// ===================== REMINDERY =====================

function startReminderChecker() {
  setInterval(async () => {
    const now = Date.now();

    const result = await db.execute({
      sql: 'SELECT user_id FROM partnership_reminders WHERE remind_at <= ?',
      args: [now],
    });

    for (const row of result.rows) {
      const userId = row.user_id;

      try {
        await deleteReminder(userId);

        const user = await client.users.fetch(userId);
        const dm = await user.createDM();

        await safeSend(dm, "⏰ Minęło 5 dni! Czy chcesz nawiązać nowe partnerstwo?");
      } catch (e) {
        console.error(`Błąd przypomnienia dla ${userId}:`, e.message);
      }
    }
  }, 10000);
}

// ===================== EVENT =====================

client.on('messageCreate', async (message) => {
  if (message.guild) return;
  if (message.createdTimestamp < botStartTime) return;

  const isMe = message.author.id === client.user.id;
  const content = message.content.trim();

  // ===================== TWOJE KOMENDY =====================

  if (isMe) {

    if (content === 'reklama') {
      for (const ad of ALL_ADS) {
        await safeSend(message.channel, ad);
      }
      return;
    }

    if (content.startsWith('wstaw')) {
      const parts = content.split(' ');

      const fromTimestamp = Date.parse(`${parts[2]} ${parts[1]}`);
      const indexes = parts.slice(3).join('').split(',').map(n => parseInt(n));

      const recipientId = message.channel.recipient?.id;
      if (!recipientId) return;

      const fetchedMessages = await message.channel.messages.fetch({ limit: 100 });

      const userAds = fetchedMessages.filter(m =>
        m.author.id === recipientId &&
        m.content.includes('https://discord.gg/') &&
        m.createdTimestamp >= fromTimestamp
      );

      const partnerMention = `<@${recipientId}>`;

      for (const channelId of indexes.map(i => PARTNER_CHANNELS[i - 1])) {
        const ch = await client.channels.fetch(channelId).catch(() => null);
        if (!ch) continue;

        for (const [, ad] of userAds) {
          await safeSend(ch, `${ad.content}\n\n🤝 Partner: ${partnerMention}`);
        }
      }

      return;
    }

    if (content === 'odnowa') {
      const recipientId = message.channel.recipient?.id;
      if (!recipientId) return;

      pendingRenewals.set(recipientId, true);
      await message.channel.send("Czy chcesz za 5 dni znowu nawiązać partnerstwo? Wpisz **tak** lub **nie**");
      return;
    }

    return;
  }

  // ===================== ODPOWIEDZI =====================

  if (pendingRenewals.has(message.author.id)) {
    const answer = content.toLowerCase();

    if (answer.includes('tak')) {
      const remindAt = Date.now() + REMINDER_DELAY;
      await setReminder(message.author.id, remindAt);
      pendingRenewals.delete(message.author.id);
    }

    if (answer.includes('nie')) {
      pendingRenewals.delete(message.author.id);
    }

    return;
  }
});

client.login(process.env.DISCORD_TOKEN);
