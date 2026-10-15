import React from "react"
import { useLocation, Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Check } from "lucide-react"

const steps = [
  { path: "/discover", key: "discover", label: "Discover" },
  { path: "/idea", key: "idea", label: "Idea" },
  { path: "/profile", key: "profile", label: "Profile" },
  { path: "/analysis", key: "analysis", label: "Analysis" },
  { path: "/finance", key: "finance", label: "Finance" },
  { path: "/report", key: "report", label: "Report" },
]

export const Stepper: React.FC = () => {
  const location = useLocation()
  const { t } = useTranslation()

  // Find index of current route
  const currentIdx = steps.findIndex(
    (s) => location.pathname === s.path || location.pathname.startsWith(s.path + "/")
  )

  if (location.pathname === "/" || currentIdx === -1) {
    return null
  }

  return (
    <div className="w-full bg-card border-b border-border py-3 px-4 shadow-xs" data-stepper>
      <div className="max-w-4xl mx-auto flex min-w-0 items-center justify-between overflow-x-auto">
        {steps.map((step, idx) => {
          const isDone = idx < currentIdx
          const isCurrent = idx === currentIdx

          return (
            <React.Fragment key={step.key}>
              <Link
                to={step.path}
                aria-label={t(`stepper.${step.key}`)}
                className={`flex items-center gap-2 group flex-shrink-0 transition-opacity ${
                  isCurrent
                    ? "opacity-100"
                    : isDone
                    ? "opacity-80 hover:opacity-100"
                    : "opacity-40 pointer-events-none"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-semibold border ${
                    isDone
                      ? "bg-primary text-white border-primary"
                      : isCurrent
                      ? "bg-primary/15 text-primary border-primary ring-2 ring-primary/20"
                      : "bg-secondary/40 text-muted-foreground border-border"
                  }`}
                >
                  {isDone ? <Check className="w-4 h-4" /> : idx + 1}
                </div>
                <span
                  className={`hidden text-xs font-medium sm:inline md:text-sm ${
                    isCurrent ? "text-primary font-bold" : "text-muted-foreground"
                  }`}
                >
                  {t(`stepper.${step.key}`)}
                </span>
              </Link>

              {idx < steps.length - 1 && (
                <div
                  className={`h-0.5 flex-1 mx-2 min-w-[12px] max-w-[40px] rounded transition-colors ${
                    idx < currentIdx ? "bg-primary" : "bg-border"
                  }`}
                />
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}

