import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Sai da demonstração: apaga os cookies de demo neste browser/aparelho.
 * Use no tablet ou telemóvel se abriu /demo por engano e quer usar o programa em modo normal.
 */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin
  const response = NextResponse.redirect(origin + '/', 302)
  response.cookies.set('nonato_demo', '', { path: '/', maxAge: 0 })
  response.cookies.set('nonato_demo_start', '', { path: '/', maxAge: 0 })
  response.cookies.set('nonato_demo_recipient', '', { path: '/', maxAge: 0 })
  response.cookies.set('nonato_demo_modules', '', { path: '/', maxAge: 0 })
  return response
}
