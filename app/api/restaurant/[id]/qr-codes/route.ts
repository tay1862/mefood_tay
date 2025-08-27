import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET - ดึงรายการ QR Codes ทั้งหมด
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params
    const restaurantId = parseInt(id)

    const qrCodes = await prisma.qRSession.findMany({
      where: {
        table: {
          userId: restaurantId
        }
      },
      include: {
        table: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const formattedQRCodes = qrCodes.map(qr => ({
      id: qr.id,
      tableId: qr.tableId,
      table: {
        id: qr.table.id,
        number: qr.table.number,
        name: qr.table.name,
        capacity: qr.table.capacity,
        status: qr.table.status
      },
      qrCodeUrl: qr.qrCodeUrl,
      isActive: qr.isActive,
      createdAt: qr.createdAt.toISOString(),
      lastUsed: qr.lastUsed?.toISOString()
    }))

    return NextResponse.json(formattedQRCodes)
  } catch (error) {
    console.error('Error fetching QR codes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch QR codes' },
      { status: 500 }
    )
  }
}

// POST - สร้าง QR Code ใหม่
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params
    const restaurantId = parseInt(id)
    const body = await request.json()
    const { tableId } = body

    if (!tableId) {
      return NextResponse.json(
        { error: 'Table ID is required' },
        { status: 400 }
      )
    }

    // ตรวจสอบว่าโต๊ะมีอยู่จริงและเป็นของร้านนี้
    const table = await prisma.table.findFirst({
      where: {
        id: tableId,
        restaurantId: restaurantId
      }
    })

    if (!table) {
      return NextResponse.json(
        { error: 'Table not found' },
        { status: 404 }
      )
    }

    // ตรวจสอบว่ามี QR Code ที่ใช้งานได้อยู่แล้วหรือไม่
    const existingQR = await prisma.qRCode.findFirst({
      where: {
        tableId: tableId,
        isActive: true
      }
    })

    if (existingQR) {
      return NextResponse.json(
        { error: 'Active QR code already exists for this table' },
        { status: 409 }
      )
    }

    // สร้าง QR Code URL
    const qrCodeUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/restaurant/${restaurantId}/table/${tableId}`

    // สร้าง QR Code ใหม่
    const newQRCode = await prisma.qRCode.create({
      data: {
        tableId: tableId,
        qrCodeUrl: qrCodeUrl,
        isActive: true
      },
      include: {
        table: true
      }
    })

    const formattedQRCode = {
      id: newQRCode.id,
      tableId: newQRCode.tableId,
      table: {
        id: newQRCode.table.id,
        number: newQRCode.table.number,
        name: newQRCode.table.name,
        capacity: newQRCode.table.capacity,
        status: newQRCode.table.status
      },
      qrCodeUrl: newQRCode.qrCodeUrl,
      isActive: newQRCode.isActive,
      createdAt: newQRCode.createdAt.toISOString(),
      lastUsed: newQRCode.lastUsed?.toISOString()
    }

    return NextResponse.json(formattedQRCode, { status: 201 })
  } catch (error) {
    console.error('Error creating QR code:', error)
    return NextResponse.json(
      { error: 'Failed to create QR code' },
      { status: 500 }
    )
  }
}

