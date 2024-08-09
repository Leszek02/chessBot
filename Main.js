const express = require('express');
const puppeteer = require('puppeteer');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const { findGame, newestGames } = require('./Compress.js');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.text());
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/submit', async (req, res) => {
  const content = await req.body;
  let pgn = await findGame(content);

  startBot(pgn);
});

app.post('/get-games', (req, res) => {
  const { username, gamesNum } = req.body;

  console.log(username);
  console.log(gamesNum);

  const games = [
    {
      White: 'lesze007',
      Black: 'macneruchy',
      UTCDate: new Date(Date.UTC(2024, 7, 3, 12, 40, 48)),
      WhiteElo: '589',
      BlackElo: '465',
      TimeControl: '1/259200',
      Termination: 'lesze007 won by resignation',
      Link: 'https://www.chess.com/game/daily/686081797',
    },
    {
      White: 'lesze007',
      Black: 'macneruchy',
      UTCDate: new Date(Date.UTC(2024, 6, 31, 13, 18, 30)),
      WhiteElo: '465',
      BlackElo: '589',
      TimeControl: '1/259200',
      Termination: 'macneruchy won by checkmate',
      Link: 'https://www.chess.com/game/daily/684986803',
    },
  ];
  res.json(games);
});

async function startBot(pgn) {
  try {
    const browser = await puppeteer.launch({
      headless: false,
      args: ['--start-maximized'],
    });
    const page = await browser.newPage();
    const { width, height } = await page.evaluate(() => {
      return {
        width: window.screen.width,
        height: window.screen.height - 80,
      };
    });
    await page.setViewport({ width, height });

    // Load session data
    const sessionFile = 'session.json';
    if (fs.existsSync(sessionFile)) {
      const sessionData = JSON.parse(fs.readFileSync(sessionFile));
      await page.setCookie(...sessionData.cookies);
      await page.evaluateOnNewDocument((storageData) => {
        localStorage.clear();
        for (const key in storageData) {
          localStorage.setItem(key, storageData[key]);
        }
      }, sessionData.localStorage);
    }

    await page.goto('https://lichess.org/paste');

    // Check if already logged in
    const isLoggedIn = await page.evaluate(() => {
      return !!!document.querySelector('.signin');
    });

    if (!isLoggedIn) {
      // Perform login
      await page.goto('https://lichess.org/login');
      await page.type('input[name="username"]', process.env.LICHESS_USERNAME);
      await page.type('input[name="password"]', process.env.LICHESS_PASSWORD);
      await page.click('.submit.button');
      await page.waitForNavigation();
      await page.goto('https://lichess.org/paste', { waitUntil: 'domcontentloaded' });

      //Save session data
      const cookies = await page.cookies();
      const localStorage = await page.evaluate(() => {
        let data = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          data[key] = localStorage.getItem(key);
        }
        return data;
      });

      fs.writeFileSync(sessionFile, JSON.stringify({ cookies, localStorage }, null, 2));

      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    await page.waitForSelector('#form3-pgn');

    await page.evaluate((text) => {
      document.querySelector('#form3-pgn').value = text;
    }, pgn);

    await page.click('label[for="form3-analyse"]');
    await page.click('.submit.button.text');
  } catch (error) {
    console.error(error);
  }
}

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
