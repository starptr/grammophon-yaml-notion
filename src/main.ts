import 'dotenv/config';
import { Client, isNotionClientError } from '@notionhq/client';
import * as YAML from 'yaml';
import throttledQueue from 'throttled-queue';
import * as fs from 'fs';

const throttle = throttledQueue(1, 500);

const notion = new Client({ auth: process.env.NOTION_KEY });
const worksDbId = process.env.NOTION_DB_GWORKS_ID;
const plistsDbId = process.env.NOTION_DB_PLISTS_ID;

const legacyFile = fs.readFileSync('./data/grammophon.yaml', 'utf8');
const data = YAML.parse(legacyFile);

interface Work {
  title?: string;
  album?: string;

  artist: string;
  links?: {
    youtube?: string;
    spotify?: string;
    soundcloud?: string;
    tiktok?: boolean;
    douyin?: boolean;
    meme?: boolean;
    classical?: boolean;
  }
}
interface Playlist {
  [playlistName: string]: Work[];
}
const seasons = ['spring', 'summer', 'autumn', 'winter'] as const;
type Season = typeof seasons[number];
interface YamlData {
  [year: string]: {
    // eslint-disable-next-line no-unused-vars
    [season in Season]: Playlist[];
  };
}

/*
Parse a comma-separated string of artists into an array
*/
function parseArtists(str: string): string[] {
  const padded = str.split(',');
  const artists = padded.map((paddedStr) => paddedStr.trim());
  return artists;
}

interface WorkProps {
  playlistName: string;
  dbWkOrderIdx: number;
  name: string;
  artists: string[];
  youtube: string | null;
  spotify: string | null;
  soundcloud: string | null;
  album: boolean;
  tiktok: boolean;
  douyin: boolean;
  meme: boolean;
  classical: boolean;
}
async function reqAddWork(params: WorkProps) {
  const plData = await throttle(() => notion.databases.query({
    database_id: plistsDbId,
    filter: {
      property: 'name',
      title: {
        equals: params.playlistName,
      },
    },
  }));
  const plId = plData.results[0].id;
  const res = await throttle(() => notion.pages.create({
    parent: { database_id: worksDbId },
    properties: {
      playlists: {
        relation: [{
          id: plId,
        }],
      },
      'work order': {
        number: params.dbWkOrderIdx,
      },
      name: {
        title: [{
          text: { content: params.name },
        }],
      },
      artists: {
        multi_select: params.artists.map((artist) => ({
          name: artist,
        })),
      },
      YouTube: {
        url: params.youtube,
      },
      Spotify: {
        url: params.spotify,
      },
      SoundCloud: {
        url: params.soundcloud,
      },
      album: { checkbox: params.album },
      TikTok: { checkbox: params.tiktok },
      Douyin: { checkbox: params.douyin },
      meme: { checkbox: params.meme },
      classical: { checkbox: params.classical },
    },
  }));
  return res;
}

/*
`works` should be ordered from top to bottom
*/
async function pushDataFromWorks(playlistName: string, works: Work[]) {
  let dbWkOrderIdx = 100;
  for (const work of works) {
    const title: string = work.title || work.album;
    const isAlbum: boolean = work.album !== undefined && work.album !== null;
    const artists: string[] = parseArtists(work.artist);
    const youtube: string = work.links?.youtube || null;
    const spotify: string = work.links?.spotify || null;
    const soundcloud: string = work.links?.soundcloud || null;
    const tiktok: boolean = !!work.links?.tiktok;
    const douyin: boolean = !!work.links?.douyin;
    const meme: boolean = !!work.links?.meme;
    const classical: boolean = !!work.links?.classical;
    const workProps: WorkProps = {
      playlistName,
      dbWkOrderIdx,
      name: title,
      artists,
      youtube,
      spotify,
      soundcloud,
      album: isAlbum,
      tiktok,
      douyin,
      meme,
      classical,
    };
    await reqAddWork(workProps);
    dbWkOrderIdx += 100;
  }
}

async function reqAddPlaylist(year: number, season: Season, dbPlOrderIdx: number, playlistName: string) {
  const res = await throttle(() => notion.pages.create({
    parent: { database_id: plistsDbId },
    properties: {
      name: {
        title: [
          {
            text: {
              content: playlistName,
            },
          },
        ],
      },
      year: {
        number: year,
      },
      season: {
        select: {
          name: season,
        },
      },
      'pl order': {
        number: dbPlOrderIdx,
      },
    },
  }));
  return res;
}

/*
`playlists` should be ordered from bottom to top.
*/
async function pushDataFromPlaylists(year: number, season: Season, playlists: Playlist[]) {
  let dbPlOrderIdx = 10;
  for (const playlist of playlists) {
    const [[playlistName, works]] = Object.entries(playlist);
    await reqAddPlaylist(year, season, dbPlOrderIdx, playlistName);
    await pushDataFromWorks(playlistName, works);
    dbPlOrderIdx += 10;
  }
}

/*
Year in DB is ordered from earliest to most recent
Works are ordered from top to bottom
*/
async function pushDataFromYaml(yamlData: YamlData) {
  const years = Object.entries(yamlData);
  years.sort((year1, year2) => (year1[0] < year2[0] ? -1 : 1));
  for (const yearDataPair of years) {
    const [yearStr, yearData] = yearDataPair;
    const year = parseInt(yearStr, 10);
    for (const season of seasons) {
      if (season in yearData) {
        const playlists = yearData[season];
        playlists.reverse(); // process lower playlist first
        await pushDataFromPlaylists(year, season, playlists);
      }
    }
  }
  //await Promise.all(years.map(async (yearDataPair) => {
  //  const [yearStr, yearData] = yearDataPair;
  //  const year = parseInt(yearStr, 10);
  //  await Promise.all(seasons.map(async (season) => {
  //    if (season in yearData) {
  //      const playlists = yearData[season];
  //      playlists.reverse(); // process lower playlist first
  //      await pushDataFromPlaylists(year, season, playlists);
  //    }
  //  }));
  //}));
}
console.log(await pushDataFromYaml(data));

// async function addItem(txt: string) {
//   try {
//     const response = await notion.pages.create({
//       parent: { database_id: worksDbId },
//       properties: {
//         title: {
//           title: [
//             {
//               text: {
//                 content: txt,
//               },
//             },
//           ],
//         },
//       },
//     });
//     console.log(response);
//     console.log('Nice this worked');
//   } catch (error: unknown) {
//     if (isNotionClientError(error)) {
//       console.log('Notion error: ', error);
//     } else {
//       console.log('General error: ', error);
//     }
//   }
// }
// 
// // await addItem('my text');
// 
// async function seeDb() {
//   const res = await notion.databases.query({
//     database_id: worksDbId,
//   });
//   console.log(res.results.map((page) => page.properties['work order']));
// }
// 
// // await seeDb();
