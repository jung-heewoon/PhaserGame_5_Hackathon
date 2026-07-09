import {
  Endpoint,
  type ContributeWeeklyDefenseReq,
  type ContributeWeeklyDefenseRsp,
  type GetWeeklyDefenseRsp,
} from '../../../../shared/api.ts';

class WeeklyDefenseClientImpl {
  private cached: GetWeeklyDefenseRsp | null = null;

  getCached(): GetWeeklyDefenseRsp | null {
    return this.cached;
  }

  async fetchStatus(): Promise<GetWeeklyDefenseRsp> {
    const rsp = await fetch(Endpoint.GetWeeklyDefense, {
      headers: { Accept: 'application/json' },
    });
    if (!rsp.ok) {
      throw new Error(`weekly-defense status failed: ${rsp.status}`);
    }
    const data = (await rsp.json()) as GetWeeklyDefenseRsp;
    this.cached = data;
    return data;
  }

  async contribute(
    payload: ContributeWeeklyDefenseReq,
  ): Promise<ContributeWeeklyDefenseRsp> {
    const rsp = await fetch(Endpoint.ContributeWeeklyDefense, {
      body: JSON.stringify(payload),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });
    if (!rsp.ok) {
      throw new Error(`weekly-defense contribute failed: ${rsp.status}`);
    }
    const data = (await rsp.json()) as ContributeWeeklyDefenseRsp;
    this.cached = data;
    return data;
  }
}

export const weeklyDefenseClient = new WeeklyDefenseClientImpl();
