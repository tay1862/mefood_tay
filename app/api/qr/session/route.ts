import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { createQRSession, validateQRSession } from '@/lib/qr-utils'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tableId, customerName, guestCount } = body

    if (!tableId) {
      return NextResponse.json(
        { error: 'Table ID is required' },
        { status: 400 }
      )
    }

    // Verify table exists and is active
    const table = await prisma.table.findUnique({
      where: { id: tableId },
      include: { user: true }
    })

    if (!table || !table.isActive) {
      return NextResponse.json(
        { error: 'Table not found or inactive' },
        { status: 404 }
      )
    }

    // Check if QR code is active for this table
    if (!table.qrCodeActive) {
      return NextResponse.json(
        { error: 'QR code ordering is currently disabled for this table' },
        { status: 403 }
      )
    }

    // Create new QR session
    const qrSession = await createQRSession(
      tableId,
      customerName || undefined,
      guestCount || 1
    )

    return NextResponse.json({
      sessionToken: qrSession.sessionToken,
      tableNumber: table.number,
      tableName: table.name,
      restaurantName: table.user.restaurantName,
      guestCount: qrSession.guestCount
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating QR session:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionToken = searchParams.get('token')

    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Session token is required' },
        { status: 400 }
      )
    }

    // Validate session
    const qrSession = await validateQRSession(sessionToken)

    if (!qrSession) {
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      sessionToken: qrSession.sessionToken,
      tableNumber: qrSession.table.number,
      tableName: qrSession.table.name,
      restaurantName: qrSession.table.user.restaurantName,
      customerName: qrSession.customerName,
      guestCount: qrSession.guestCount,
      startedAt: qrSession.startedAt,
      isActive: qrSession.isActive
    })

  } catch (error) {
    console.error('Error validating QR session:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

