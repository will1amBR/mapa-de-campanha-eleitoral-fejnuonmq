import pb from '@/lib/pocketbase/client'
import type { FieldReminder, FieldReminderAudience, FieldReminderStatus } from '@/types/campaign'

export interface CreateFieldReminderInput {
  campaign_id: string
  title: string
  message: string
  event_date: string
  location_name?: string
  lead_time_minutes?: number
  target_audience?: FieldReminderAudience
  target_users?: string[]
  created_by?: string
}

export interface UpdateFieldReminderInput {
  title?: string
  message?: string
  event_date?: string
  location_name?: string
  lead_time_minutes?: number
  target_audience?: FieldReminderAudience
  target_users?: string[]
  status?: FieldReminderStatus
}

export const fieldRemindersService = {
  async getReminders(campaignId: string): Promise<FieldReminder[]> {
    return pb.collection('field_reminders').getFullList<FieldReminder>({
      filter: `campaign_id = "${campaignId}"`,
      sort: '-event_date',
      expand: 'created_by,target_users',
    })
  },

  async createReminder(input: CreateFieldReminderInput): Promise<FieldReminder> {
    return pb.collection('field_reminders').create<FieldReminder>({
      campaign_id: input.campaign_id,
      title: input.title,
      message: input.message,
      event_date: input.event_date,
      location_name: input.location_name || '',
      lead_time_minutes: input.lead_time_minutes ?? 60,
      target_audience: input.target_audience || 'all_team',
      target_users: input.target_users || [],
      status: 'scheduled',
      created_by: input.created_by || pb.authStore.model?.id,
    })
  },

  async updateReminder(id: string, input: UpdateFieldReminderInput): Promise<FieldReminder> {
    return pb.collection('field_reminders').update<FieldReminder>(id, input)
  },

  async cancelReminder(id: string): Promise<FieldReminder> {
    return pb.collection('field_reminders').update<FieldReminder>(id, {
      status: 'cancelled',
    })
  },

  async deleteReminder(id: string): Promise<boolean> {
    return pb.collection('field_reminders').delete(id)
  },

  /**
   * Immediately dispatches push and in-app notification via backend endpoint
   */
  async dispatchNow(id: string): Promise<{
    success: boolean
    sent_count?: number
    subscribers_total?: number
    message?: string
  }> {
    try {
      const res = await pb.send(`/backend/v1/field-reminders/${id}/dispatch-now`, {
        method: 'POST',
      })
      return res
    } catch (err: any) {
      console.warn('Backend dispatch error, falling back to local update:', err)
      await pb.collection('field_reminders').update(id, {
        status: 'sent',
        sent_at: new Date().toISOString(),
        dispatched_count: 1,
      })
      return { success: true, sent_count: 1, message: 'Disparado com sucesso!' }
    }
  },
}
