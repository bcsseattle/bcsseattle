import 'server-only';

import { Client } from '@notionhq/client';
import React from 'react';
import {
  BlockObjectResponse,
  PageObjectResponse
} from '@notionhq/client/build/src/api-endpoints';

export const notion = new Client({
  auth: process.env.NOTION_TOKEN
});

export const fetchPages = React.cache(() => {
  return notion.databases.query({
    database_id: process.env.NOTION_DATABASE_ID!,
    filter: {
      property: 'Status',
      select: {
        equals: 'Published'
      }
    }
  });
});

export const fetchPageBySlug = React.cache((slug: string) => {
  try {
    const data = notion.databases
      .query({
        database_id: process.env.NOTION_DATABASE_ID!,
        filter: {
          property: 'Slug',
          rich_text: {
            equals: slug
          }
        }
      })
      .then((res) => res.results[0] as PageObjectResponse | undefined);
      return data;
  } catch (error) {
    console.error('error', error);
  }
});

export const fetchPageBlocks = React.cache(async (pageId: string) => {
    const blocks: BlockObjectResponse[] = [];
    let cursor: string | undefined | null = undefined;

    do {
        const response = await notion.blocks.children.list({
            block_id: pageId,
            start_cursor: cursor
        });

        blocks.push(...(response.results as BlockObjectResponse[])); // Cast response.results to BlockObjectResponse[]
        cursor = response.next_cursor;
    } while (cursor);

    return blocks;
});
