'use client'

import { useSyncExternalStore } from 'react'
import { getFeedbackSettings, setFeedbackSetting, subscribeFeedbackSettings } from './settings'

export function useFeedbackSettings() {
  const settings = useSyncExternalStore(subscribeFeedbackSettings, getFeedbackSettings, getFeedbackSettings)
  return { settings, setSetting: setFeedbackSetting }
}
