import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import pb from '@/lib/pocketbase/client'
import type { Campaign } from '@/types/campaign'
import { useAuth } from './use-auth'

interface CampaignContextType {
  campaigns: Campaign[]
  currentCampaign: Campaign | null
  loadingCampaigns: boolean
  setCurrentCampaign: (campaign: Campaign) => void
  refreshCampaigns: () => Promise<void>
}

const CampaignContext = createContext<CampaignContextType | undefined>(undefined)

export const CampaignProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [currentCampaign, setCurrentCampaignState] = useState<Campaign | null>(null)
  const [loadingCampaigns, setLoadingCampaigns] = useState(true)

  const loadCampaigns = useCallback(async () => {
    if (!pb.authStore.isValid) {
      setCampaigns([])
      setCurrentCampaignState(null)
      setLoadingCampaigns(false)
      return
    }

    try {
      setLoadingCampaigns(true)
      const records = await pb.collection('campaigns').getFullList<Campaign>({
        sort: 'name',
      })
      setCampaigns(records)

      if (records.length > 0) {
        // check saved preference in localStorage or user record
        const savedId =
          localStorage.getItem('estrategista_active_campaign_id') || user?.current_campaign
        const matching = records.find((c) => c.id === savedId) || records[0]
        setCurrentCampaignState(matching)
      } else {
        setCurrentCampaignState(null)
      }
    } catch {
      // ignore
    } finally {
      setLoadingCampaigns(false)
    }
  }, [user?.current_campaign])

  useEffect(() => {
    loadCampaigns()
  }, [loadCampaigns])

  const setCurrentCampaign = (campaign: Campaign) => {
    setCurrentCampaignState(campaign)
    localStorage.setItem('estrategista_active_campaign_id', campaign.id)
    if (user?.id) {
      pb.collection('users')
        .update(user.id, { current_campaign: campaign.id })
        .catch(() => {})
    }
  }

  return (
    <CampaignContext.Provider
      value={{
        campaigns,
        currentCampaign,
        loadingCampaigns,
        setCurrentCampaign,
        refreshCampaigns: loadCampaigns,
      }}
    >
      {children}
    </CampaignContext.Provider>
  )
}

export const useCampaign = () => {
  const context = useContext(CampaignContext)
  if (!context) {
    throw new Error('useCampaign must be used within a CampaignProvider')
  }
  return context
}
