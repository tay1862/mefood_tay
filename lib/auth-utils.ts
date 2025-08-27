import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface UserWithRole {
  id: string
  email: string
  ownerName: string | null
  isStaff: boolean
  role: {
    id: string
    name: string
    description?: string | null
  } | null
  restaurantOwnerId: string | null
}

/**
 * Get the current user with role information from the server session
 */
export async function getCurrentUser(): Promise<UserWithRole | null> {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return null
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        role: true
      }
    })

    if (!user) {
      return null
    }

    return {
      id: user.id,
      email: user.email,
      ownerName: user.ownerName,
      isStaff: user.isStaff,
      role: user.role,
      restaurantOwnerId: user.restaurantOwnerId
    }
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

/**
 * Check if the current user has admin access (owner or admin role)
 */
export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser()
  
  if (!user) {
    return false
  }

  // Restaurant owner (not staff) is always admin
  if (!user.isStaff) {
    return true
  }

  // Staff with Admin role
  return user.role?.name === 'Admin'
}

/**
 * Check if the current user has a specific role
 */
export async function hasRole(roleName: string): Promise<boolean> {
  const user = await getCurrentUser()
  
  if (!user) {
    return false
  }

  return user.role?.name === roleName
}

/**
 * Check if the current user has any of the specified roles
 */
export async function hasAnyRole(roleNames: string[]): Promise<boolean> {
  const user = await getCurrentUser()
  
  if (!user) {
    return false
  }

  if (!user.role) {
    return false
  }

  return roleNames.includes(user.role.name)
}

/**
 * Get the restaurant owner ID for the current user
 * If the user is the owner, returns their ID
 * If the user is staff, returns their restaurantOwnerId
 */
export async function getRestaurantOwnerId(): Promise<string | null> {
  const user = await getCurrentUser()
  
  if (!user) {
    return null
  }

  return user.isStaff ? user.restaurantOwnerId : user.id
}

/**
 * Check if the current user can access admin features
 */
export async function canAccessAdmin(): Promise<boolean> {
  return await isAdmin()
}

/**
 * Check if the current user can manage staff
 */
export async function canManageStaff(): Promise<boolean> {
  return await isAdmin()
}

/**
 * Check if the current user can manage orders
 */
export async function canManageOrders(): Promise<boolean> {
  return await hasAnyRole(['Admin', 'Waiter', 'Kitchen', 'Cafe', 'WaterStation'])
}

/**
 * Check if the current user can process payments
 */
export async function canProcessPayments(): Promise<boolean> {
  return await hasAnyRole(['Admin', 'Cashier'])
}

/**
 * Check if the current user can view kitchen orders
 */
export async function canViewKitchenOrders(): Promise<boolean> {
  return await hasAnyRole(['Admin', 'Kitchen'])
}

/**
 * Check if the current user can view cafe orders
 */
export async function canViewCafeOrders(): Promise<boolean> {
  return await hasAnyRole(['Admin', 'Cafe'])
}

/**
 * Check if the current user can view water station orders
 */
export async function canViewWaterStationOrders(): Promise<boolean> {
  return await hasAnyRole(['Admin', 'WaterStation'])
}

/**
 * Get allowed departments for the current user
 */
export async function getAllowedDepartments(): Promise<string[]> {
  const user = await getCurrentUser()
  
  if (!user || !user.role) {
    return []
  }

  // Admin can see all departments
  if (user.role.name === 'Admin') {
    return ['Kitchen', 'Cafe', 'WaterStation']
  }

  // Map roles to departments
  const roleDepartmentMap: { [key: string]: string[] } = {
    'Kitchen': ['Kitchen'],
    'Cafe': ['Cafe'],
    'WaterStation': ['WaterStation'],
    'Waiter': ['Kitchen', 'Cafe', 'WaterStation'], // Waiters can see all to serve
    'Cashier': [] // Cashiers don't need department-specific views
  }

  return roleDepartmentMap[user.role.name] || []
}

