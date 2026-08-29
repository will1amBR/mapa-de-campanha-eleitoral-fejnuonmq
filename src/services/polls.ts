import pb from '@/lib/pocketbase/client'
import type { Poll, PollScenario } from '@/types/campaign'

export const pollsService = {
  async getPolls(campaignId: string, scenario?: PollScenario): Promise<Poll[]> {
    let filter = `campaign_id = "${campaignId}"`
    if (scenario) {
      filter += ` && scenario = "${scenario}"`
    }
    return pb.collection('polls').getFullList<Poll>({
      filter,
      sort: 'poll_date',
    })
  },

  async getLatestPoll(campaignId: string): Promise<Poll | null> {
    try {
      const records = await pb.collection('polls').getList<Poll>(1, 1, {
        filter: `campaign_id = "${campaignId}"`,
        sort: '-poll_date',
      })
      return records.items[0] || null
    } catch {
      return null
    }
  },

  async createPoll(data: Partial<Poll>): Promise<Poll> {
    return pb.collection('polls').create<Poll>(data)
  },

  async updatePoll(id: string, data: Partial<Poll>): Promise<Poll> {
    return pb.collection('polls').update<Poll>(id, data)
  },

  async deletePoll(id: string): Promise<boolean> {
    return pb.collection('polls').delete(id)
  },
}
