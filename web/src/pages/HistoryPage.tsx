import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSavedReports, deleteSavedReport, type SavedReportItem } from '@/services/api'
import { useAppStore } from '@/store/useAppStore'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import {
  FileText,
  Calendar,
  MapPin,
  Trash2,
  ExternalLink,
  PlusCircle,
  AlertTriangle,
  WifiOff,
  CheckCircle2,
} from 'lucide-react'

export const HistoryPage: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { setReport, report: cachedLastReport } = useAppStore()

  const [page, setPage] = useState(1)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true

  // Fetch reports with react-query
  const { data, isLoading, isError } = useQuery({
    queryKey: ['saved-reports', page],
    queryFn: () => getSavedReports(page, 10),
    staleTime: 1000 * 60 * 3,
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSavedReport(id),
    onSuccess: () => {
      setDeleteConfirmId(null)
      queryClient.invalidateQueries({ queryKey: ['saved-reports'] })
    },
  })

  const reports = data?.reports || []

  const handleOpenReport = (item: SavedReportItem) => {
    if (item.report_data && Object.keys(item.report_data).length > 0) {
      setReport(item.report_data as any)
    }
    navigate('/report')
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary" />
              <span>{t('history.title', 'My Enterprise Reports')}</span>
            </h1>
            {!isOnline && (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <WifiOff className="w-3 h-3" />
                <span>Offline</span>
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t('history.subtitle', 'Saved rural feasibility studies, financial projections, and bank readiness assessments.')}
          </p>
        </div>

        <Button
          onClick={() => navigate('/discover')}
          className="min-h-[44px] flex items-center gap-2 font-semibold"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{t('history.new_plan', 'Start a New Plan')}</span>
        </Button>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="max-w-md w-full border-border bg-card shadow-xl animate-in fade-in zoom-in-95">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-destructive/15 text-destructive">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-base">
                    {t('history.delete_confirm_title', 'Delete Saved Report?')}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {t('history.delete_confirm_desc', 'This action will remove the report from your saved account history. It cannot be undone.')}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteConfirmId(null)}
                  className="min-h-[40px]"
                >
                  {t('common.cancel', 'Cancel')}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(deleteConfirmId)}
                  className="min-h-[40px]"
                >
                  {deleteMutation.isPending ? 'Deleting...' : t('common.delete', 'Confirm Delete')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="p-5 rounded-lg border border-border bg-card animate-pulse space-y-3"
            >
              <div className="h-5 bg-secondary rounded w-1/3" />
              <div className="h-4 bg-secondary rounded w-1/2" />
              <div className="h-8 bg-secondary rounded w-1/4 mt-2" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && reports.length === 0 && (
        <Card className="border-border border-dashed text-center p-8 sm:p-12 space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <FileText className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-foreground">
              {t('history.empty_title', 'No saved plans yet')}
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {t('history.empty_desc', 'Complete your rural feasibility assessment to save and view itemised financial reports and loan eligibility here.')}
            </p>
          </div>
          <div className="pt-2">
            <Button
              onClick={() => navigate('/discover')}
              className="min-h-[48px] px-6 font-semibold inline-flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t('history.new_plan_cta', 'Start a New Business Plan')}</span>
            </Button>
          </div>
        </Card>
      )}

      {/* Saved Reports List */}
      {!isLoading && reports.length > 0 && (
        <div className="space-y-4">
          {reports.map((item) => {
            const formattedDate = new Date(item.created_at).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })

            const badgeColor =
              item.verdict?.label === 'feasible'
                ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30'
                : item.verdict?.label === 'feasible_with_conditions'
                ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30'
                : 'bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-500/30'

            return (
              <Card
                key={item.id}
                className="border-border hover:border-primary/40 transition-colors shadow-xs"
              >
                <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold border capitalize ${badgeColor}`}
                      >
                        {item.verdict?.label?.replace(/_/g, ' ') || 'Evaluation'} • {item.verdict?.score}/100
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{formattedDate}</span>
                      </span>
                      {item.district && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-primary" />
                          <span>{item.district}</span>
                        </span>
                      )}
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-foreground">
                      {item.business_name}
                    </h3>

                    <div className="flex flex-wrap items-center gap-4 text-xs">
                      {item.investment && (
                        <div>
                          <span className="text-muted-foreground mr-1">Investment:</span>
                          <span className="font-semibold text-foreground">
                            {formatCurrency(item.investment)}
                          </span>
                        </div>
                      )}
                      {item.monthly_income && (
                        <div>
                          <span className="text-muted-foreground mr-1">Estimated Income:</span>
                          <span className="font-semibold text-primary">
                            {formatCurrency(item.monthly_income)}/mo
                          </span>
                        </div>
                      )}
                    </div>

                    {item.verdict?.summary && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {item.verdict.summary}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenReport(item)}
                      className="min-h-[40px] flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>{t('history.open_report', 'View Report')}</span>
                    </Button>

                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(item.id)}
                      className="min-w-[40px] min-h-[40px] flex items-center justify-center p-2 rounded-md hover:bg-destructive/15 text-muted-foreground hover:text-destructive transition-colors cursor-pointer border border-border"
                      title="Delete saved report"
                      aria-label="Delete report"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

