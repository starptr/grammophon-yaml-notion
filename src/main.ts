import 'dotenv/config'
import { Client, isNotionClientError } from "@notionhq/client"
import YAML from 'yaml'
import fs from 'fs'

const notion = new Client({ auth: process.env.NOTION_KEY });
const dbId = process.env.NOTION_DB_GWORKS_ID;

const legacyFile = fs.readFileSync('./data/grammophon.yaml', 'utf8');
const data = YAML.parse(legacyFile);
console.log(data);

async function addItem(txt: string) {
  try {
    const response = await notion.pages.create({
      parent: { database_id: dbId },
      properties: {
        title: {
          title: [
            {
              text: {
                content: txt
              }
            },
          ]
        }
      }
    });
    console.log(response);
    console.log("Nice this worked");
  } catch (error: unknown) {
    if (isNotionClientError(error)) {
      console.log("Notion error: ", error);
    } else {
      console.log("General error: ", error);
    }
  }
}

await addItem("my text");
