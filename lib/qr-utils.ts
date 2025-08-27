import QRCode from 'qrcode'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Generate QR code data URL for a table
 */
export async function generateTableQRCode(
  tableId: string, 
  baseUrl: string = process.env.NEXTAUTH_URL || 'http://localhost:3000'
): Promise<string> {
  try {
    // Create QR session token
    const sessionToken = generateSessionToken()
    
    // Create the QR session in database
    await prisma.qRSession.create({
      data: {
        sessionToken,
        tableId,
        isActive: true
      }
    })
    
    // Generate QR code URL
    const qrUrl = `${baseUrl}/customer/table/${sessionToken}`
    
    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(qrUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#2E5E45',
        light: '#FFFFFF'
      }
    })
    
    return qrCodeDataUrl
  } catch (error) {
    console.error('Error generating QR code:', error)
    throw new Error('Failed to generate QR code')
  }
}

/**
 * Generate a unique session token
 */
export function generateSessionToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * Validate and get QR session
 */
export async function validateQRSession(sessionToken: string) {
  try {
    const qrSession = await prisma.qRSession.findUnique({
      where: { sessionToken },
      include: {
        table: {
          include: {
            user: true
          }
        }
      }
    })
    
    if (!qrSession || !qrSession.isActive) {
      return null
    }
    
    return qrSession
  } catch (error) {
    console.error('Error validating QR session:', error)
    return null
  }
}

/**
 * Create a new QR session for a table
 */
export async function createQRSession(tableId: string, customerName?: string, guestCount: number = 1) {
  try {
    const sessionToken = generateSessionToken()
    
    const qrSession = await prisma.qRSession.create({
      data: {
        sessionToken,
        tableId,
        customerName,
        guestCount,
        isActive: true
      },
      include: {
        table: {
          include: {
            user: true
          }
        }
      }
    })
    
    return qrSession
  } catch (error) {
    console.error('Error creating QR session:', error)
    throw new Error('Failed to create QR session')
  }
}

/**
 * End a QR session (when bill is paid)
 */
export async function endQRSession(sessionToken: string) {
  try {
    const qrSession = await prisma.qRSession.update({
      where: { sessionToken },
      data: {
        isActive: false,
        endedAt: new Date()
      }
    })
    
    return qrSession
  } catch (error) {
    console.error('Error ending QR session:', error)
    throw new Error('Failed to end QR session')
  }
}

/**
 * Get active QR sessions for a restaurant
 */
export async function getActiveQRSessions(userId: string) {
  try {
    const sessions = await prisma.qRSession.findMany({
      where: {
        isActive: true,
        table: {
          userId
        }
      },
      include: {
        table: true,
        orders: {
          include: {
            items: {
              include: {
                menuItem: true
              }
            }
          }
        },
        staffCalls: {
          where: {
            status: {
              in: ['PENDING', 'ACKNOWLEDGED']
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        musicRequests: {
          where: {
            status: {
              in: ['PENDING', 'APPROVED']
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      },
      orderBy: {
        startedAt: 'desc'
      }
    })
    
    return sessions
  } catch (error) {
    console.error('Error getting active QR sessions:', error)
    throw new Error('Failed to get active QR sessions')
  }
}

/**
 * Generate QR code for table display (static QR that creates sessions)
 */
export async function generateStaticTableQRCode(
  tableId: string,
  baseUrl: string = process.env.NEXTAUTH_URL || 'http://localhost:3000'
): Promise<string> {
  try {
    // Generate QR code URL that will create a new session
    const qrUrl = `${baseUrl}/customer/table/new/${tableId}`
    
    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(qrUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#2E5E45',
        light: '#FFFFFF'
      }
    })
    
    return qrCodeDataUrl
  } catch (error) {
    console.error('Error generating static QR code:', error)
    throw new Error('Failed to generate static QR code')
  }
}

