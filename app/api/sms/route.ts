import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { normalizeSmsProduct } from '@/lib/smsProducts'

const ParsedItemSchema = z.object({
  product: z.string().min(1),
  price: z.number().finite(),
  unit: z.string().default('EUR/t'),
  location: z.string().optional(),
})

const BodySchema = z.object({
  source: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  items: z.array(ParsedItemSchema).min(1),
  raw: z.string(),
})

const GetQuerySchema = z.object({
  product: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
})

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json()
    const parsed = BodySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Vigane andmestruktuur: ' + parsed.error.issues[0]?.message },
        { status: 400 }
      )
    }

    const { source, date, items, raw } = parsed.data

    const created = await prisma.$transaction(
      items.map((item) =>
        prisma.smsPrice.create({
          data: {
            source,
            product: normalizeSmsProduct(item.product),
            price: item.price,
            unit: item.unit,
            location: item.location ?? null,
            rawSms: raw,
            date,
          },
        })
      )
    )

    return NextResponse.json({ count: created.length, ids: created.map((r) => r.id) })
  } catch (e) {
    if (e instanceof SyntaxError) {
      return NextResponse.json({ error: 'Vigane JSON päring' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Andmebaasi viga' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const parsed = GetQuerySchema.safeParse({
      product: searchParams.get('product') ?? undefined,
      limit: searchParams.get('limit') ?? 100,
    })

    if (!parsed.success) {
      return NextResponse.json({ error: 'Vigased parameetrid' }, { status: 400 })
    }

    const { product, limit } = parsed.data

    const records = await prisma.smsPrice.findMany({
      where: product
        ? { product: { startsWith: product, mode: 'insensitive' } }
        : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json(
      records.map((r) => ({
        ...r,
        product: normalizeSmsProduct(r.product),
        createdAt: r.createdAt.toISOString(),
      }))
    )
  } catch {
    return NextResponse.json({ error: 'Andmebaasi viga' }, { status: 500 })
  }
}
