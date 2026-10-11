import React from "react"
import { useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useTranslation } from "react-i18next"
import { useAppStore } from "@/store/useAppStore"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, ArrowRight, UserCheck } from "lucide-react"

const profileSchema = z.object({
  state: z.string().min(1, "State is required"),
  district: z.string().min(1, "District is required"),
  village: z.string().optional(),
  capital: z.number().min(0, "Capital must be positive"),
  category: z.enum(["general", "obc", "sc", "st"]),
  gender: z.enum(["f", "m", "o"]),
  age: z.number().min(18, "Age must be at least 18").max(80),
  experience: z.enum(["none", "some", "experienced"]),
  collateral: z.boolean().default(false),
})

type ProfileFormData = z.infer<typeof profileSchema>

export const ProfilePage: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { profile, setProfile } = useAppStore()

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ProfileFormData>({
    defaultValues: {
      state: profile.state || "Maharashtra",
      district: profile.district || "Nashik",
      village: profile.village || "Sinnar",
      capital: profile.capital || 50000,
      category: profile.category || "obc",
      gender: profile.gender || "f",
      age: profile.age || 34,
      experience: profile.experience || "none",
      collateral: profile.collateral || false,
    },
  })

  const onSubmit = (data: ProfileFormData) => {
    setProfile(data)
    navigate("/analysis")
  }

  // Quick preset loader for the demo persona: Sunita
  const loadDemoPersona = () => {
    setValue("state", "Maharashtra")
    setValue("district", "Nashik")
    setValue("village", "Sinnar")
    setValue("capital", 50000)
    setValue("category", "obc")
    setValue("gender", "f")
    setValue("age", 34)
    setValue("experience", "none")
    setValue("collateral", false)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-earth-900 flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-primary-700" />
            <span>{t("profile.title")}</span>
          </h2>
          <p className="text-sm text-earth-600">
            Details are used deterministically to match government subsidies and loan qualifications.
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={loadDemoPersona}
          className="border border-earth-300 self-start sm:self-auto text-xs"
        >
          Fill Demo (Sunita, 34, Nashik)
        </Button>
      </div>

      <Card className="border-border shadow-xs">
        <CardContent className="p-6 md:p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Location Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-earth-800">
                  {t("profile.state")}
                </label>
                <input
                  {...register("state")}
                  placeholder="e.g. Maharashtra"
                  className="w-full h-11 px-3 text-sm rounded-md border border-input bg-card focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {errors.state && (
                  <p className="text-xs text-destructive">{errors.state.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-earth-800">
                  {t("profile.district")}
                </label>
                <input
                  {...register("district")}
                  placeholder="e.g. Nashik"
                  className="w-full h-11 px-3 text-sm rounded-md border border-input bg-card focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {errors.district && (
                  <p className="text-xs text-destructive">{errors.district.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-earth-800">
                  {t("profile.village")} (Optional)
                </label>
                <input
                  {...register("village")}
                  placeholder="e.g. Sinnar"
                  className="w-full h-11 px-3 text-sm rounded-md border border-input bg-card focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Financial Capacity */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-earth-800">
                {t("profile.capital")}
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-earth-500 font-semibold text-sm">₹</span>
                <input
                  type="number"
                  {...register("capital")}
                  className="w-full h-11 pl-8 pr-3 text-sm font-semibold rounded-md border border-input bg-card focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <p className="text-xs text-earth-500">
                Your own savings or family investment available right now.
              </p>
              {errors.capital && (
                <p className="text-xs text-destructive">{errors.capital.message}</p>
              )}
            </div>

            {/* Demographic attributes for Scheme Matching */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-earth-800">
                  {t("profile.category")}
                </label>
                <select
                  {...register("category")}
                  className="w-full h-11 px-3 text-sm rounded-md border border-input bg-card focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="general">{t("profile.categories.general")}</option>
                  <option value="obc">{t("profile.categories.obc")}</option>
                  <option value="sc">{t("profile.categories.sc")}</option>
                  <option value="st">{t("profile.categories.st")}</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-earth-800">
                  {t("profile.gender")}
                </label>
                <select
                  {...register("gender")}
                  className="w-full h-11 px-3 text-sm rounded-md border border-input bg-card focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="f">{t("profile.genders.f")} (Special Subsidies)</option>
                  <option value="m">{t("profile.genders.m")}</option>
                  <option value="o">{t("profile.genders.o")}</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-earth-800">
                  {t("profile.age")}
                </label>
                <input
                  type="number"
                  {...register("age")}
                  className="w-full h-11 px-3 text-sm rounded-md border border-input bg-card focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {errors.age && (
                  <p className="text-xs text-destructive">{errors.age.message}</p>
                )}
              </div>
            </div>

            {/* Experience & Collateral */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-earth-800">
                  {t("profile.experience")}
                </label>
                <select
                  {...register("experience")}
                  className="w-full h-11 px-3 text-sm rounded-md border border-input bg-card focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="none">{t("profile.experience_levels.none")}</option>
                  <option value="some">{t("profile.experience_levels.some")}</option>
                  <option value="experienced">{t("profile.experience_levels.experienced")}</option>
                </select>
              </div>

              <div className="space-y-1.5 flex flex-col justify-end">
                <label className="flex items-center gap-3 p-2.5 rounded-md border border-border bg-card cursor-pointer hover:bg-secondary/40">
                  <input
                    type="checkbox"
                    {...register("collateral")}
                    className="w-4 h-4 text-primary rounded border-border focus:ring-primary"
                  />
                  <span className="text-xs text-foreground font-medium">
                    Have immovable property / land to pledge as collateral
                  </span>
                </label>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-between pt-6 border-t border-earth-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/idea")}
                className="flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{t("common.back")}</span>
              </Button>

              <Button type="submit" className="flex items-center gap-1.5 font-semibold">
                <span>View Local Analysis</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
