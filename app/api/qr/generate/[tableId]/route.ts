import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { generateStaticTableQRCode } from '@/lib/qr-utils'
import { canAccessAdmin, getRestaurantOwnerId } from '@/lib/auth-utils'

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: { tableId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin access
    if (!(await canAccessAdmin())) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Get restaurant owner ID
    const restaurantOwnerId = await getRestaurantOwnerId()
    if (!restaurantOwnerId) {
      return NextResponse.json({ error: 'Restaurant owner not found' }, { status: 404 })
    }

    // Verify table exists and belongs to this restaurant
    const table = await prisma.table.findFirst({
      where: {
        id: params.tableId,
        userId: restaurantOwnerId
      }
    })

    if (!table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 })
    }

    // Generate QR code
    const baseUrl = process.env.NEXTAUTH_URL || `${request.nextUrl.protocol}//${request.nextUrl.host}`
    const qrCodeDataUrl = await generateStaticTableQRCode(params.tableId, baseUrl)

    // Update table with QR code
    await prisma.table.update({
      where: { id: params.tableId },
      data: { qrCode: qrCodeDataUrl }
    })

    return NextResponse.json({
      qrCode: qrCodeDataUrl,
      tableNumber: table.number,
      tableName: table.name
    })

  } catch (error) {
    console.error('Error generating QR code:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

