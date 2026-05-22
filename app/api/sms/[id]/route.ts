import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id, 10)
  if (isNaN(id)) {
    return NextResponse.json({ error: 'Vigane ID' }, { status: 400 })
  }

  try {
    await prisma.smsPrice.delete({ where: { id } })
    return NextResponse.json({ deleted: id })
  } catch {
    return NextResponse.json({ error: 'Kirjet ei leitud' }, { status: 404 })
  }
}
