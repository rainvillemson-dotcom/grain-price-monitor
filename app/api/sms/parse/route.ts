import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { parseSms } from '@/lib/smsParser'
import { ParseError } from '@/lib/types'

const BodySchema = z.object({
  text: z.string().min(1).max(2000),
})

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json()
    const parsed = BodySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Vigane päring: text väli puudub või on liiga pikk' },
        { status: 400 }
      )
    }

    const result = parseSms(parsed.data.text)
    return NextResponse.json(result)
  } catch (e) {
    if (e instanceof ParseError) {
      return NextResponse.json({ error: e.message }, { status: 422 })
    }
    if (e instanceof SyntaxError) {
      return NextResponse.json({ error: 'Vigane JSON päring' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Sisemine viga' }, { status: 500 })
  }
}
