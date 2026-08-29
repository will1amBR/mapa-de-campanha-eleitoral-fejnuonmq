import pb from '@/lib/pocketbase/client'
import type { AppNotification, NotificationType, NotificationSeverity } from '@/types/campaign'

export const notificationsService = {
  async getNotifications(campaignId: string, limit = 50): Promise<AppNotification[]> {
    return pb
      .collection('notifications')
      .getList<AppNotification>(1, limit, {
        filter: `campaign_id = "${campaignId}"`,
        sort: '-created',
        expand: 'user_id',
      })
      .then((res) => res.items)
  },

  async getUnreadCount(campaignId: string): Promise<number> {
    try {
      const res = await pb.collection('notifications').getList<AppNotification>(1, 1, {
        filter: `campaign_id = "${campaignId}" && read = false`,
      })
      return res.totalItems
    } catch {
      return 0
    }
  },

  async createNotification(data: {
    campaign_id: string
    title: string
    body: string
    type?: NotificationType
    severity?: NotificationSeverity
    link?: string
    user_id?: string
  }): Promise<AppNotification> {
    return pb.collection('notifications').create<AppNotification>({
      campaign_id: data.campaign_id,
      title: data.title,
      body: data.body,
      type: data.type || 'info',
      severity: data.severity || 'info',
      read: false,
      link: data.link || '',
      user_id: data.user_id || undefined,
    })
  },

  async markAsRead(notificationId: string): Promise<AppNotification> {
    return pb.collection('notifications').update<AppNotification>(notificationId, {
      read: true,
    })
  },

  async markAllAsRead(campaignId: string): Promise<void> {
    const unread = await pb.collection('notifications').getFullList<AppNotification>({
      filter: `campaign_id = "${campaignId}" && read = false`,
    })

    await Promise.all(
      unread.map((item) => pb.collection('notifications').update(item.id, { read: true })),
    )
  },

  async deleteNotification(notificationId: string): Promise<boolean> {
    return pb.collection('notifications').delete(notificationId)
  },
}
