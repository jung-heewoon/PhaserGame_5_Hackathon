import {
  Endpoint,
  type ClaimTombstonesRsp,
  type GetTombstonesRsp,
  type SubmitTombstoneCommentReq,
  type SubmitTombstoneCommentRsp,
  type UpsertTombstoneReq,
  type UpsertTombstoneRsp,
} from '../../../../shared/api.ts';

class TombstoneClientImpl {
  private cached: GetTombstonesRsp | null = null;

  getCached(): GetTombstonesRsp | null {
    return this.cached;
  }

  async fetchTombstones(): Promise<GetTombstonesRsp> {
    const rsp = await fetch(Endpoint.GetTombstones, {
      headers: { Accept: 'application/json' },
    });
    if (!rsp.ok) {
      throw new Error(`tombstone list failed: ${rsp.status}`);
    }
    const data = (await rsp.json()) as GetTombstonesRsp;
    this.cached = data;
    return data;
  }

  async upsertOnDeath(payload: UpsertTombstoneReq): Promise<UpsertTombstoneRsp> {
    const rsp = await fetch(Endpoint.UpsertTombstone, {
      body: JSON.stringify(payload),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });
    if (!rsp.ok) {
      throw new Error(`tombstone upsert failed: ${rsp.status}`);
    }
    const data = (await rsp.json()) as UpsertTombstoneRsp;
    this.cached = null;
    return data;
  }

  async submitDeathReportComment(
    payload: SubmitTombstoneCommentReq,
  ): Promise<SubmitTombstoneCommentRsp> {
    const rsp = await fetch(Endpoint.SubmitTombstoneComment, {
      body: JSON.stringify(payload),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });
    if (!rsp.ok) {
      throw new Error(`tombstone comment failed: ${rsp.status}`);
    }
    return (await rsp.json()) as SubmitTombstoneCommentRsp;
  }

  async claim(usernames: string[]): Promise<ClaimTombstonesRsp> {
    const rsp = await fetch(Endpoint.ClaimTombstones, {
      body: JSON.stringify({ usernames }),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });
    if (!rsp.ok) {
      throw new Error(`tombstone claim failed: ${rsp.status}`);
    }
    const data = (await rsp.json()) as ClaimTombstonesRsp;
    this.cached = null;
    return data;
  }

  clearCache(): void {
    this.cached = null;
  }
}

export const tombstoneClient = new TombstoneClientImpl();
