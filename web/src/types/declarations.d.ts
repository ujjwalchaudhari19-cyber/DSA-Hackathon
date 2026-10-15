/**
 * Module declaration shims for packages whose bundled .d.ts files TypeScript
 * cannot locate under moduleResolution=bundler.
 *
 * Using `any` for every export is intentional — these packages work correctly
 * at runtime; the shims only suppress TS7016 / TS2305 type errors.
 */

// ── lucide-react ────────────────────────────────────────────────────────────
declare module "lucide-react" {
  import type { FC, SVGProps } from "react"

  export type LucideProps = SVGProps<SVGSVGElement> & {
    size?: number | string
    strokeWidth?: number | string
    absoluteStrokeWidth?: boolean
    color?: string
    className?: string
  }
  export type LucideIcon = FC<LucideProps>

  // Every named icon is a React functional component with LucideProps.
  // We can't enumerate all ~1 000 icons, so we declare the module as
  // exporting any named value of type LucideIcon via a module-level namespace.
  export const Activity: LucideIcon
  export const AlertCircle: LucideIcon
  export const AlertTriangle: LucideIcon
  export const ArrowLeft: LucideIcon
  export const ArrowRight: LucideIcon
  export const Banknote: LucideIcon
  export const BarChart2: LucideIcon
  export const BarChart3: LucideIcon
  export const Bot: LucideIcon
  export const Building2: LucideIcon
  export const Calculator: LucideIcon
  export const Calendar: LucideIcon
  export const Check: LucideIcon
  export const CheckCircle: LucideIcon
  export const CheckCircle2: LucideIcon
  export const CheckSquare: LucideIcon
  export const ChevronDown: LucideIcon
  export const Clock: LucideIcon
  export const Compass: LucideIcon
  export const CreditCard: LucideIcon
  export const DollarSign: LucideIcon
  export const Download: LucideIcon
  export const ExternalLink: LucideIcon
  export const FileCheck: LucideIcon
  export const FileText: LucideIcon
  export const Globe: LucideIcon
  export const HelpCircle: LucideIcon
  export const History: LucideIcon
  export const Languages: LucideIcon
  export const Layers: LucideIcon
  export const Lightbulb: LucideIcon
  export const Loader2: LucideIcon
  export const Lock: LucideIcon
  export const LogIn: LucideIcon
  export const LogOut: LucideIcon
  export const Mail: LucideIcon
  export const MapPin: LucideIcon
  export const MessageSquare: LucideIcon
  export const Mic: LucideIcon
  export const MicOff: LucideIcon
  export const Moon: LucideIcon
  export const Phone: LucideIcon
  export const Plus: LucideIcon
  export const PlusCircle: LucideIcon
  export const RefreshCw: LucideIcon
  export const RotateCcw: LucideIcon
  export const Save: LucideIcon
  export const Scale: LucideIcon
  export const Send: LucideIcon
  export const Settings: LucideIcon
  export const ShieldAlert: LucideIcon
  export const ShieldCheck: LucideIcon
  export const SlidersHorizontal: LucideIcon
  export const Sparkles: LucideIcon
  export const Square: LucideIcon
  export const Sprout: LucideIcon
  export const Sun: LucideIcon
  export const Trash2: LucideIcon
  export const TrendingUp: LucideIcon
  export const Trophy: LucideIcon
  export const User: LucideIcon
  export const UserCheck: LucideIcon
  export const UserPlus: LucideIcon
  export const Users: LucideIcon
  export const Users2: LucideIcon
  export const WifiOff: LucideIcon
  export const X: LucideIcon
  export const XCircle: LucideIcon
}

// ── firebase ────────────────────────────────────────────────────────────────
declare module "firebase/app" {
  export function initializeApp(config: object, name?: string): any
  export function getApps(): any[]
  export function getApp(name?: string): any
}

declare module "firebase/auth" {
  export function getAuth(app?: any): any
  export function signInWithPopup(auth: any, provider: any): Promise<any>
  export function signInWithEmailAndPassword(auth: any, email: string, password: string): Promise<any>
  export function createUserWithEmailAndPassword(auth: any, email: string, password: string): Promise<any>
  export function signInAnonymously(auth: any): Promise<any>
  export function signOut(auth: any): Promise<void>
  export function onAuthStateChanged(auth: any, callback: (user: any) => void): () => void
  export function linkWithCredential(user: any, credential: any): Promise<any>
  export function linkWithPopup(user: any, provider: any): Promise<any>
  export const GoogleAuthProvider: any
  export const EmailAuthProvider: any
  export type User = any
  export type Auth = any
  export type UserCredential = any
}

// ── @hookform/resolvers ─────────────────────────────────────────────────────
declare module "@hookform/resolvers/zod" {
  export function zodResolver(schema: any): any
}
