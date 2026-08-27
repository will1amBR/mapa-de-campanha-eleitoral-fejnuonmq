import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'

import { AuthProvider } from '@/hooks/use-auth'
import { CampaignProvider } from '@/hooks/use-campaign'
import { ProtectedRoute } from '@/components/ProtectedRoute'

// Pages
import { Dashboard } from '@/pages/Dashboard'
import { LiveMapPage } from '@/pages/LiveMapPage'
import { TeamFieldPage } from '@/pages/TeamFieldPage'
import { TeamPerformancePage } from '@/pages/TeamPerformancePage'
import { TerritoryAnalysisPage } from '@/pages/TerritoryAnalysisPage'
import { SupportPointsPage } from '@/pages/SupportPointsPage'
import { AiConsultantPage } from '@/pages/AiConsultantPage'
import { SettingsPage } from '@/pages/SettingsPage'

// Auth Pages
import { LoginPage } from '@/pages/LoginPage'
import { SignupPage } from '@/pages/SignupPage'
import { VerifyEmailPage } from '@/pages/VerifyEmailPage'
import { ResetPasswordPage } from '@/pages/ResetPasswordPage'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { ConfirmEmailChangePage } from '@/pages/ConfirmEmailChangePage'
import NotFound from '@/pages/NotFound'

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <CampaignProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner position="top-right" richColors />
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/confirm-email-change" element={<ConfirmEmailChangePage />} />

            {/* Protected Campaign Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/map" element={<LiveMapPage />} />
              <Route path="/team" element={<TeamFieldPage />} />
              <Route path="/team-performance" element={<TeamPerformancePage />} />
              <Route path="/support-points" element={<SupportPointsPage />} />
              <Route path="/analysis" element={<TerritoryAnalysisPage />} />
              <Route path="/ai-consultant" element={<AiConsultantPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </CampaignProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
