import { http, HttpResponse } from 'msw'

// In-memory mock store
let mockGuestCount = 1
const mockReports = [
  {
    id: 'rep_demo_01',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    business_name: 'Small Commercial Dairy Unit (4 Cows)',
    business_type: 'dairy',
    district: 'Nashik',
    investment: 286000,
    monthly_income: 32000,
    verdict: {
      label: 'feasible_with_conditions',
      score: 71,
      summary: 'Viable with high local milk collection demand in Sinnar, requires 15% own capital cushion.',
    },
    report_data: {},
  },
  {
    id: 'rep_demo_02',
    created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
    business_name: 'Spice and Besan Grinding Mill',
    business_type: 'processing',
    district: 'Nashik',
    investment: 180000,
    monthly_income: 24000,
    verdict: {
      label: 'feasible',
      score: 84,
      summary: 'Strong village household retail demand with low setup risk.',
    },
    report_data: {},
  },
]

let mockChatSessions = [
  {
    id: 'session_demo_01',
    title: 'Mudra Kishore loan query for dairy',
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'session_demo_02',
    title: 'FSSAI registration & cattle shed permissions',
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
]

const mockSessionMessages: Record<string, any[]> = {
  session_demo_01: [
    {
      id: 'm1',
      role: 'user',
      content: 'Can I get Mudra Kishore without collateral in Nashik district?',
      timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
    {
      id: 'm2',
      role: 'advisor',
      content: 'Yes! Mudra Kishore loans up to ₹5,00,000 do not require collateral. They are covered under the Credit Guarantee Fund for Micro Units (CGFMU).',
      timestamp: new Date(Date.now() - 86400000 * 3 + 15000).toISOString(),
    },
  ],
  session_demo_02: [
    {
      id: 'm3',
      role: 'user',
      content: 'Is Gram Panchayat NOC required for cattle shed?',
      timestamp: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
    {
      id: 'm4',
      role: 'advisor',
      content: 'For a micro commercial unit (4-10 cows), a basic Gram Panchayat consent or trade certificate is recommended to ensure uninterrupted electricity connection and bank sanction.',
      timestamp: new Date(Date.now() - 86400000 * 5 + 12000).toISOString(),
    },
  ],
}

let mockUserProfile = {
  state: 'Maharashtra',
  district: 'Nashik',
  village: 'Sinnar',
  capital: 50000,
  category: 'obc',
  gender: 'f',
  age: 32,
  experience: 'none',
  collateral: false,
  preferred_language: 'en',
}

export const handlers = [
  // POST /auth/guest
  http.post('*/auth/guest', () => {
    const guestId = `guest_${mockGuestCount++}_${Date.now()}`
    return HttpResponse.json({
      access_token: `guest_token_${guestId}`,
      token_type: 'Bearer',
      guest_id: guestId,
      expires_in: 86400,
    })
  }),

  // POST /me/claim-guest-data
  http.post('*/me/claim-guest-data', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as { guest_token?: string }
    if (!body.guest_token) {
      return HttpResponse.json(
        { detail: 'Guest token is required', code: 'missing_guest_token' },
        { status: 400 }
      )
    }
    return HttpResponse.json({
      success: true,
      claimed_reports_count: mockReports.length,
      message: 'Guest data successfully claimed to user account.',
    })
  }),

  // GET /me
  http.get('*/me', ({ request }) => {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return HttpResponse.json(
        { detail: 'Authentication required', code: 'unauthorized' },
        { status: 401 }
      )
    }
    const isGuest = authHeader.includes('guest_token')
    return HttpResponse.json({
      id: isGuest ? 'guest_user_1' : 'user_prod_1',
      email: isGuest ? 'guest@gramudyam.internal' : 'entrepreneur@gramudyam.in',
      name: isGuest ? 'Guest User' : 'Sunita Patil',
      avatar_url: '',
      is_guest: isGuest,
      created_at: new Date().toISOString(),
    })
  }),

  // DELETE /me
  http.delete('*/me', () => {
    mockReports.length = 0
    mockChatSessions.length = 0
    return HttpResponse.json({
      success: true,
      message: 'User account and all associated rural enterprise data permanently deleted.',
    })
  }),

  // GET /me/profile
  http.get('*/me/profile', () => {
    return HttpResponse.json(mockUserProfile)
  }),

  // PUT /me/profile
  http.put('*/me/profile', async ({ request }) => {
    const updated = (await request.json().catch(() => ({}))) as typeof mockUserProfile
    mockUserProfile = { ...mockUserProfile, ...updated }
    return HttpResponse.json(mockUserProfile)
  }),

  // GET /reports
  http.get('*/reports', () => {
    return HttpResponse.json({
      reports: mockReports,
      total: mockReports.length,
      page: 1,
      limit: 10,
    })
  }),

  // GET /reports/:id
  http.get('*/reports/:id', ({ params }) => {
    const report = mockReports.find((r) => r.id === params.id)
    if (!report) {
      return HttpResponse.json(
        { detail: 'Report not found', code: 'not_found' },
        { status: 404 }
      )
    }
    return HttpResponse.json(report)
  }),

  // DELETE /reports/:id
  http.delete('*/reports/:id', ({ params }) => {
    const idx = mockReports.findIndex((r) => r.id === params.id)
    if (idx !== -1) {
      mockReports.splice(idx, 1)
    }
    return HttpResponse.json({
      success: true,
      message: 'Report deleted successfully',
    })
  }),

  // GET /chat/sessions
  http.get('*/chat/sessions', () => {
    return HttpResponse.json(mockChatSessions)
  }),

  // GET /chat/sessions/:id/messages
  http.get('*/chat/sessions/:id/messages', ({ params }) => {
    const msgs = mockSessionMessages[params.id as string] || []
    return HttpResponse.json(msgs)
  }),

  // DELETE /chat/sessions/:id
  http.delete('*/chat/sessions/:id', ({ params }) => {
    mockChatSessions = mockChatSessions.filter((s) => s.id !== params.id)
    delete mockSessionMessages[params.id as string]
    return HttpResponse.json({
      success: true,
      message: 'Session deleted',
    })
  }),
]

