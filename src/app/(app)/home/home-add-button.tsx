'use client'

import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useOpenAddExpense } from '@/components/layout/app-shell'
import { useT } from '@/i18n/provider'

export function HomeAddButton() {
  const openAdd = useOpenAddExpense()
  const t = useT()
  return (
    <Button full size="lg" onClick={openAdd} className="md:hidden">
      <Plus className="size-5" strokeWidth={2.5} aria-hidden />
      {t('home.addExpense')}
    </Button>
  )
}
