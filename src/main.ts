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
type Season = 'spring' | 'summer' | 'autumn' | 'winter'
interface YamlData {
  [year: string]: {
    // eslint-disable-next-line no-unused-vars
    [season in Season]: Playlist[];
  };
}
async function pushDataFromYaml(yamlData: YamlData) {
  console.log(yamlData['2021'].winter[0]['a well-deserved break']);
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

//await addItem('my text');
