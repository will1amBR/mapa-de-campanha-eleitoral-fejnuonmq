import pb from '@/lib/pocketbase/client'
import type {
  DebateEvent,
  DebateAdversary,
  DebateQA,
  DebateTopic,
  DebatePrepStatus,
  DebateTargetType,
  DebateStatus,
} from '@/types/campaign'

export const debateService = {
  // Debate Events
  async getEvents(campaignId: string): Promise<DebateEvent[]> {
    return pb.collection('debate_events').getFullList<DebateEvent>({
      filter: `campaign_id = "${campaignId}"`,
      sort: 'event_date',
    })
  },

  async createEvent(data: Partial<DebateEvent>): Promise<DebateEvent> {
    return pb.collection('debate_events').create<DebateEvent>(data)
  },

  async updateEvent(id: string, data: Partial<DebateEvent>): Promise<DebateEvent> {
    return pb.collection('debate_events').update<DebateEvent>(id, data)
  },

  async deleteEvent(id: string): Promise<boolean> {
    return pb.collection('debate_events').delete(id)
  },

  // Debate Adversaries
  async getAdversaries(campaignId: string): Promise<DebateAdversary[]> {
    return pb.collection('debate_adversaries').getFullList<DebateAdversary>({
      filter: `campaign_id = "${campaignId}"`,
      sort: 'name',
    })
  },

  async createAdversary(data: Partial<DebateAdversary>): Promise<DebateAdversary> {
    return pb.collection('debate_adversaries').create<DebateAdversary>(data)
  },

  async updateAdversary(id: string, data: Partial<DebateAdversary>): Promise<DebateAdversary> {
    return pb.collection('debate_adversaries').update<DebateAdversary>(id, data)
  },

  async deleteAdversary(id: string): Promise<boolean> {
    return pb.collection('debate_adversaries').delete(id)
  },

  // Debate QA
  async getQAList(campaignId: string): Promise<DebateQA[]> {
    return pb.collection('debate_qa').getFullList<DebateQA>({
      filter: `campaign_id = "${campaignId}"`,
      sort: '-priority,-created',
      expand: 'adversary_id,debate_id',
    })
  },

  async createQA(data: Partial<DebateQA>): Promise<DebateQA> {
    return pb.collection('debate_qa').create<DebateQA>(data, {
      expand: 'adversary_id,debate_id',
    })
  },

  async updateQA(id: string, data: Partial<DebateQA>): Promise<DebateQA> {
    return pb.collection('debate_qa').update<DebateQA>(id, data, {
      expand: 'adversary_id,debate_id',
    })
  },

  async deleteQA(id: string): Promise<boolean> {
    return pb.collection('debate_qa').delete(id)
  },
}
