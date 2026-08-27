import { useEffect } from 'react'
import pb from '@/lib/pocketbase/client'

/**
 * Hook to automatically capture UTM params from URL,
 * store anonymous visitor_id, track visits to `utm_visits` collection,
 * and listen to clicks on CTA buttons marked with [data-conversion="type"].
 */
export function useUtmTracking(campaignId?: string) {
  useEffect(() => {
    // Generate or retrieve persistent anonymous visitor_id
    let visitorId = localStorage.getItem('estrategista_visitor_id')
    if (!visitorId) {
      visitorId = 'vis_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36)
      localStorage.setItem('estrategista_visitor_id', visitorId)
    }

    const searchParams = new URLSearchParams(window.location.search)
    const utm_source = searchParams.get('utm_source') || ''
    const utm_medium = searchParams.get('utm_medium') || ''
    const utm_campaign = searchParams.get('utm_campaign') || ''
    const utm_content = searchParams.get('utm_content') || ''
    const utm_term = searchParams.get('utm_term') || ''

    // If UTM parameters exist in current URL, record the visit
    if (utm_source || utm_campaign || utm_medium) {
      const recordedKey = `utm_recorded_${utm_source}_${utm_campaign}_${visitorId}`
      const hasRecordedRecently = sessionStorage.getItem(recordedKey)

      if (!hasRecordedRecently) {
        sessionStorage.setItem(recordedKey, '1')
        pb.collection('utm_visits')
          .create({
            campaign_id: campaignId || null,
            utm_source,
            utm_medium,
            utm_campaign,
            utm_content,
            utm_term,
            landing_page: window.location.pathname,
            visitor_id: visitorId,
            ip_hash: 'sp_browser_' + (navigator.language || 'pt-BR'),
            user_agent: navigator.userAgent.substring(0, 120),
            referrer: document.referrer || '',
            converted: false,
            conversion_type: '',
          })
          .catch((err) => {
            console.debug('UTM tracking capture notice:', err)
          })
      }
    }

    // Global listener for data-conversion CTA clicks
    const handleCtaClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest('[data-conversion]')
      if (!target) return

      const conversionType = target.getAttribute('data-conversion') || 'cta_click'

      pb.collection('utm_visits')
        .create({
          campaign_id: campaignId || null,
          utm_source: utm_source || 'organic_app',
          utm_medium: utm_medium || 'ui_interaction',
          utm_campaign: utm_campaign || 'direct',
          utm_content: utm_content || '',
          utm_term: utm_term || '',
          landing_page: window.location.pathname,
          visitor_id: visitorId,
          user_agent: navigator.userAgent.substring(0, 120),
          referrer: document.referrer || '',
          converted: true,
          conversion_type: conversionType,
        })
        .catch((err) => {
          console.debug('Conversion event capture notice:', err)
        })
    }

    document.addEventListener('click', handleCtaClick)
    return () => {
      document.removeEventListener('click', handleCtaClick)
    }
  }, [campaignId])
}
