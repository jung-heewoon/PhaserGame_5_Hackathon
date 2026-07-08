import type {GetLeaderboardRsp, LeaderboardEntry} from '../../../../shared/api.ts';

function entriesFrom(
  rows: ReadonlyArray<{username: string; score: number}>,
): LeaderboardEntry[] {
  return rows.map((row, index) => ({
    rank: index + 1,
    username: row.username,
    score: row.score,
  }));
}

const POST_ROWS = [
  {username: 'dice_demon', score: 980},
  {username: 'yatzy_knight', score: 845},
  {username: 'hell_runner', score: 720},
  {username: 'combo_cat', score: 615},
  {username: 'railgun_rex', score: 540},
  {username: 'nuke_nova', score: 480},
  {username: 'shotty_sam', score: 390},
  {username: 'minigun_mia', score: 310},
  {username: 'pistol_pete', score: 240},
  {username: 'rookie_roll', score: 120},
] as const;

const GLOBAL_ROWS = [
  {username: 'global_champ', score: 2500},
  {username: 'dice_demon', score: 2100},
  {username: 'subreddit_slugger', score: 1880},
  {username: 'yatzy_knight', score: 1650},
  {username: 'hell_runner', score: 1420},
  {username: 'crown_chaser', score: 1190},
  {username: 'combo_cat', score: 980},
  {username: 'railgun_rex', score: 760},
  {username: 'nuke_nova', score: 520},
  {username: 'pistol_pete', score: 280},
] as const;

/** 로컬/실패 시 UI 확인용 더미 랭킹 */
export function createDummyLeaderboard(myScore = 0): GetLeaderboardRsp {
  const postEntries = entriesFrom(POST_ROWS);
  const globalEntries = entriesFrom(GLOBAL_ROWS);

  const postRank =
    myScore > 0
      ? Math.max(
          1,
          postEntries.filter(entry => entry.score > myScore).length + 1,
        )
      : 0;
  const globalRank =
    myScore > 0
      ? Math.max(
          1,
          globalEntries.filter(entry => entry.score > myScore).length + 1,
        )
      : 0;

  const mePost =
    myScore > 0
      ? {rank: postRank, username: 'you', score: myScore}
      : null;
  const meGlobal =
    myScore > 0
      ? {rank: globalRank, username: 'you', score: myScore}
      : null;

  return {
    post: {
      entries: postEntries,
      me: mePost && mePost.rank <= 50 ? mePost : null,
      meOutOfRange:
        mePost && mePost.rank > 50
          ? {rank: mePost.rank, score: mePost.score}
          : undefined,
    },
    global: {
      entries: globalEntries,
      me: meGlobal && meGlobal.rank <= 10 ? meGlobal : null,
      meOutOfRange:
        meGlobal && meGlobal.rank > 10
          ? {rank: meGlobal.rank, score: meGlobal.score}
          : undefined,
    },
  };
}
