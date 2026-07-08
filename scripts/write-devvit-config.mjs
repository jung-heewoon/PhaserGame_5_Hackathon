import {copyFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const full = {
  $schema: 'https://developers.reddit.com/schema/config-file.v1.json',
  name: 'hell-dice-shooter',
  post: {
    dir: 'dist/client',
    entrypoints: {
      default: {inline: true, entry: 'splash.html'},
      game: {entry: 'game.html'},
    },
  },
  server: {dir: 'dist/server', entry: 'index.cjs'},
  menu: {
    items: [
      {
        label: '[hell-dice-shooter] New Post',
        description: 'Create a new hell-dice-shooter post.',
        location: 'subreddit',
        endpoint: '/internal/on/menu/new-post',
      },
    ],
  },
  triggers: {onAppInstall: '/internal/on/app/install'},
  scripts: {
    build: 'node scripts/build.mjs',
    dev: 'node scripts/watch-server.mjs',
  },
  dev: {subreddit: 'hell_dice_shooter_dev'},
};

const client = structuredClone(full);
delete client.server;
delete client.menu;
delete client.triggers;

const json = `${JSON.stringify(full, null, 2)}\n`;
writeFileSync(path.join(root, 'devvit.json'), json);
writeFileSync(path.join(root, 'devvit.client.json'), `${JSON.stringify(client, null, 2)}\n`);
copyFileSync(path.join(root, 'devvit.json'), path.join(root, 'devvit.json.build.bak'));
