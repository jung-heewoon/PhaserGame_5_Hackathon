import {readdirSync, rmSync, unlinkSync} from 'node:fs';
import {join} from 'node:path';

rmSync('dist', {recursive: true, force: true});

for (const file of readdirSync('public')) {
  if (/\.js(\.map)?$/.test(file)) {
    unlinkSync(join('public', file));
  }
}
