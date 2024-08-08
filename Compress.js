const fs = require('fs');
const env = require('node:process');

require('dotenv').config();

const gameTemplate = {
  White: 'username1',
  Black: 'username2',
  UTCDate: '2024.13.13 25:61:61?',
  WhiteElo: '4000',
  BlackElo: '-4000',
  TimeControl: '0-30',
  Termination: 'yes',
  Link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  gameConstructor: function (white, black, UTCDate, WhiteElo, BlackElo, TimeControl, Termination, Link) {
    (this.White = white),
      (this.Black = black),
      (this.UTCDate = UTCDate),
      (this.WhiteElo = WhiteElo),
      (this.BlackElo = BlackElo),
      (this.TimeControl = TimeControl),
      (this.Termination = Termination),
      (this.Link = Link);
  },
};

async function findGame(gameString) {
  game = '';
  await downloadGames().then((pgn) => {
    const dataLines = pgn.split('\n');
    for (let i = 20; i < dataLines.length; i = i + 25) {
      if (dataLines[i].startsWith(`[Link "${gameString}`)) {
        for (let j = i - 20; j < i + 3; j++) {
          game += dataLines[j] + '\n';
        }
        break;
      }
    }
  });
  return game;
}

async function downloadGames() {
  let curTime = new Date();
  let year = curTime.getFullYear();
  let month = curTime.getMonth() + 1;
  api = `https://api.chess.com/pub/player/${process.env.CHESSCOM_USERNAME}/games/${year}/${month}/pgn`;
  let response = await fetch(api, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/x-chess-pgn',
    },
  });
  const pgn = await response.text();
  return pgn;
}

function extract(str) {
  const match = str.match(/"([^"]*)"/);
  return match ? match[1] : null;
}

function convertToDate(dateString, timeString) {
  const [year, month, day] = dateString.split('.').map(Number);
  const [hour, minute, seconds] = timeString.split(':').map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour, minute, seconds));
}

async function newestGames(newestNumber) {
  gameList = [];
  await downloadGames().then((pgn) => {
    const dataLines = pgn.split('\n');
    for (let i = 22; i < dataLines.length; i = i + 25) {
      const newGame = Object.create(gameTemplate);

      newGame.gameConstructor(
        extract(dataLines[i - 18]),
        extract(dataLines[i - 17]),
        convertToDate(extract(dataLines[i - 11]), extract(dataLines[i - 10])),
        extract(dataLines[i - 9]),
        extract(dataLines[i - 8]),
        extract(dataLines[i - 7]),
        extract(dataLines[i - 6]),
        extract(dataLines[i - 2])
      );
      if (i == 22) {
        //console.log("%o", newGame);
      }
      gameList.push(newGame);
    }
  });
  gameList.sort((a, b) => new Date(b.UTCDate) - new Date(a.UTCDate));
  return gameList.slice(0, newestNumber);
}

// newestGames(5).then((gameList) => {
//     console.log(gameList);
// })

module.exports = { findGame, newestGames };
