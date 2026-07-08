import {
  Endpoint,
  type GetLeaderboardRsp,
  type SubmitLeaderboardRsp,
} from '../../../../shared/api.ts';

export type LeaderboardScope = 'post' | 'global';

class LeaderboardClientImpl {
  private cached: GetLeaderboardRsp | null = null;

  getCached(): GetLeaderboardRsp | null {
    return this.cached;
  }

  async fetchLeaderboard(): Promise<GetLeaderboardRsp> {
    const rsp = await fetch(Endpoint.GetLeaderboard, {
      headers: {Accept: 'application/json'},
    });
    if (!rsp.ok) {
      throw new Error(`leaderboard fetch failed: ${rsp.status}`);
    }
    const data = (await rsp.json()) as GetLeaderboardRsp;
    this.cached = data;
    return data;
  }

  async submitScore(score: number): Promise<SubmitLeaderboardRsp> {
    const rsp = await fetch(Endpoint.SubmitLeaderboard, {
      body: JSON.stringify({score}),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });
    if (!rsp.ok) {
      throw new Error(`leaderboard submit failed: ${rsp.status}`);
    }
    const data = (await rsp.json()) as SubmitLeaderboardRsp;
    this.cached = data;
    return data;
  }

  clearCache(): void {
    this.cached = null;
  }
}

export const leaderboardClient = new LeaderboardClientImpl();
