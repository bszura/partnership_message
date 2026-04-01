const { Client } = require('discord.js-selfbot-v13');
const express = require('express');
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

app.get('/', (req, res) => res.send('Self-bot działa na Render! 🚀'));
app.listen(PORT, () => console.log(`Serwer pingujący działa na porcie ${PORT}`));

client.once('ready', async () => {
  console.log(`Zalogowano jako ${client.user.tag}!`);
  console.log(`Bot ${client.user.tag} jest gotowy.`);

  const sendToChannel = async (channelId, content, interval) => {
    const send = async () => {
      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (channel) {
        await channel.send(content);
        console.log(`[${new Date().toLocaleTimeString()}] Wysłano na kanał ${channelId}`);
      } else {
        console.error(`Nie znaleziono kanału ${channelId}`);
      }
    };

    await send();
    setInterval(send, interval);
  };

  await sendToChannel('1346609247869337701', '# Partnerstwa PV', 61 * 60 * 1000);
  await sendToChannel('1463018298471092434', '# Partnerstwa PV', 121 * 60 * 1000);
  await sendToChannel('1354863654540935188', '# Oferuję usługę tworzenia botów w atrakcyjnych cenach. Zapraszam do kontaktu PV', 60 * 60 * 1000);
});

client.on('error', (error) => console.error('Błąd Discorda:', error));
process.on('unhandledRejection', (error) => console.error('Nieobsłużony błąd:', error));

console.log('Próbuję się zalogować...');
client.login(process.env.DISCORD_TOKEN).then(() => {
  console.log('Login promise resolved');
}).catch((e) => {
  console.error('Błąd logowania:', e.message);
});
