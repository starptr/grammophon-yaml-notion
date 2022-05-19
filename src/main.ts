import 'dotenv/config';
import { Client, isNotionClientError } from '@notionhq/client';
import * as YAML from 'yaml';
import * as fs from 'fs';

const notion = new Client({ auth: process.env.NOTION_KEY });
const dbId = process.env.NOTION_DB_GWORKS_ID;

const legacyFile = fs.readFileSync('./data/grammophon.yaml', 'utf8');
const data = YAML.parse(legacyFile);

interface Work {
  title?: string;
  album?: string;

  artist: string;
  links: {
    youtube?: string;
    spotify?: string;
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

/*
`works` should be ordered from top to bottom
*/
async function pushDataFromWorks(playlistName: string, works: Work[]) {
  let dbWkOrderIdx = 100;
  for (const work of works) {
    const title: string = work.title || work.album;
    const isAlbum: boolean = work.album !== undefined && work.album !== null;
    const artists: string[] = parseArtists(work.artist);
    const youtube: string = work.links.youtube || '';
    const spotify: string = work.links.spotify || '';
    const tiktok: boolean = !!work.links.tiktok;
    const douyin: boolean = !!work.links.douyin;
    const meme: boolean = !!work.links.meme;
    const classical: boolean = !!work.links.classical;
    // TODO: push work payload
    dbWkOrderIdx += 100;
  }
}

async function reqAddPlaylist(year: number, season: Season, dbPlOrderIdx: number, playlistName: string) {
  // TODO:
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
  await Promise.all(years.map(async (yearDataPair) => {
    const [yearStr, yearData] = yearDataPair;
    const year = parseInt(yearStr, 10);
    await Promise.all(seasons.map(async (season) => {
      if (season in yearData) {
        const playlists = yearData[season];
        playlists.reverse(); // process lower playlist first
        await pushDataFromPlaylists(year, season, playlists);
      }
    }));
  }));
}
await pushDataFromYaml(data);

async function addItem(txt: string) {
  try {
    const response = await notion.pages.create({
      parent: { database_id: dbId },
      properties: {
        title: {
          title: [
            {
              text: {
                content: txt,
              },
            },
          ],
        },
      },
    });
    console.log(response);
    console.log('Nice this worked');
  } catch (error: unknown) {
    if (isNotionClientError(error)) {
      console.log('Notion error: ', error);
    } else {
      console.log('General error: ', error);
    }
  }
}

// await addItem('my text');
