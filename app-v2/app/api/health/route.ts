// Endpoint para health check do Railway (resposta rápida, sem lógica pesada)
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
