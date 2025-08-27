'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useTheme } from '@mui/material/styles'
import {
  Box,
  Container,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Paper,
  Divider,
  Badge,
  Tooltip
} from '@mui/material'
import {
  Dashboard,
  Kitchen,
  Restaurant,
  LocalCafe,
  WaterDrop,
  CheckCircle,
  Schedule,
  Cancel,
  Edit,
  Refresh,
  PlayArrow,
  Done,
  LocalShipping
} from '@mui/icons-material'
import { RestaurantNavbar } from '@/lib/components/RestaurantNavbar'
import { useTranslation } from 'react-i18next'

interface OrderItem {
  id: string
  quantity: number
  price: number
  notes?: string
  menuItem: {
    id: string
    name: string
    price: number
    department?: {
      id: string
      name: string
    }
    category: {
      id: string
      name: string
    }
  }
}

interface Order {
  id: string
  orderNumber: string
  status: string
  totalAmount: number
  customerName?: string
  notes?: string
  orderedAt: string
  preparingAt?: string
  readyAt?: string
  servedAt?: string
  items: OrderItem[]
  table?: {
    id: string
    number: string
    name?: string
  }
  qrSession?: {
    id: string
    customerName?: string
    guestCount: number
  }
  waiter?: {
    id: string
    ownerName?: string
  }
  cook?: {
    id: string
    ownerName?: string
  }
}

interface DashboardData {
  orders: Order[]
  statistics: {
    byStatus: { [key: string]: number }
    byDepartment: { [key: string]: number }
  }
  departments: Array<{
    id: string
    name: string
    description?: string
  }>
}

const statusConfig = {
  PENDING: { color: 'warning' as const, icon: Schedule, label: 'รอยืนยัน', action: 'confirm' },
  CONFIRMED: { color: 'info' as const, icon: CheckCircle, label: 'ยืนยันแล้ว', action: 'start_preparing' },
  PREPARING: { color: 'primary' as const, icon: Kitchen, label: 'กำลังเตรียม', action: 'mark_ready' },
  READY: { color: 'success' as const, icon: Done, label: 'พร้อมเสิร์ฟ', action: 'mark_delivered' },
  DELIVERED: { color: 'success' as const, icon: LocalShipping, label: 'เสิร์ฟแล้ว', action: null },
  CANCELLED: { color: 'error' as const, icon: Cancel, label: 'ยกเลิก', action: null }
}

const departmentIcons = {
  'Kitchen': Kitchen,
  'Cafe': LocalCafe,
  'Water Station': WaterDrop,
  'Bar': Restaurant
}

export default function OrderDashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const theme = useTheme()
  const { t } = useTranslation()

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [orderDialog, setOrderDialog] = useState(false)
  const [cancelDialog, setCancelDialog] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchDashboardData()
    }, 30000)

    return () => clearInterval(interval)
  }, [autoRefresh])

  const fetchDashboardData = useCallback(async () => {
    try {
      if (!session?.user?.id) return

      const params = new URLSearchParams()
      if (selectedDepartment !== 'all') params.append('department', selectedDepartment)
      if (selectedStatus !== 'all') params.append('status', selectedStatus)

      const response = await fetch(`/api/admin/orders/dashboard?${params}`)
      if (!response.ok) throw new Error('Failed to fetch dashboard data')
      
      const data = await response.json()
      setDashboardData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }, [session, selectedDepartment, selectedStatus])

  useEffect(() => {
    if (status === 'loading') return
    if (!session) router.push('/auth/signin')
  }, [session, status, router])

  useEffect(() => {
    if (session) {
      fetchDashboardData()
    }
  }, [session, fetchDashboardData])

  const handleOrderAction = async (orderId: string, action: string) => {
    try {
      setError(null)
      setSuccess(null)

      const response = await fetch('/api/admin/orders/dashboard', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orderId,
          action,
          userId: session?.user?.id
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update order')
      }

      const result = await response.json()
      setSuccess(result.message)
      
      // Refresh dashboard data
      await fetchDashboardData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update order')
    }
  }

  const handleCancelOrder = async () => {
    if (!selectedOrder || !cancelReason.trim()) return

    try {
      setError(null)
      setSuccess(null)

      const response = await fetch(`/api/restaurant/${session?.user?.id}/orders/${selectedOrder.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: cancelReason,
          notes: `Cancelled from dashboard`
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to cancel order')
      }

      const result = await response.json()
      setSuccess(result.message)
      setCancelDialog(false)
      setCancelReason('')
      setSelectedOrder(null)
      
      // Refresh dashboard data
      await fetchDashboardData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel order')
    }
  }

  const getOrdersByDepartment = (departmentName: string) => {
    if (!dashboardData) return []
    
    return dashboardData.orders.filter(order => 
      order.items.some(item => 
        item.menuItem.department?.name === departmentName
      )
    )
  }

  const filteredOrders = dashboardData?.orders.filter(order => {
    const departmentMatch = selectedDepartment === 'all' || 
      order.items.some(item => item.menuItem.department?.name === selectedDepartment)
    const statusMatch = selectedStatus === 'all' || order.status === selectedStatus
    return departmentMatch && statusMatch
  }) || []

  if (status === 'loading' || loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!session || !dashboardData) {
    return null
  }

  return (
    <>
      <RestaurantNavbar 
        backButton={{
          href: '/restaurant-admin/orders',
          label: 'กลับไปหน้าออเดอร์'
        }}
      />

      <Container maxWidth="xl" sx={{ mt: 2, mb: 4, px: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        {/* Header */}
        <Card sx={{ mb: 3, borderRadius: 3, boxShadow: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ 
                  p: 1.5, 
                  borderRadius: 2, 
                  backgroundColor: `${theme.palette.primary.main}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Dashboard sx={{ color: theme.palette.primary.main, fontSize: '2rem' }} />
                </Box>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
                    Order Dashboard
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    จัดการออเดอร์แบบ Real-time สำหรับห้องครัวและแผนกต่างๆ
                  </Typography>
                </Box>
              </Box>
              
              <Stack direction="row" spacing={2}>
                <Tooltip title={autoRefresh ? 'ปิดการรีเฟรชอัตโนมัติ' : 'เปิดการรีเฟรชอัตโนมัติ'}>
                  <Button
                    variant={autoRefresh ? 'contained' : 'outlined'}
                    onClick={() => setAutoRefresh(!autoRefresh)}
                    startIcon={<Refresh />}
                    size="small"
                  >
                    Auto Refresh
                  </Button>
                </Tooltip>
                <Button
                  variant="outlined"
                  onClick={fetchDashboardData}
                  startIcon={<Refresh />}
                  size="small"
                >
                  รีเฟรช
                </Button>
              </Stack>
            </Box>

            {/* Filters */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>แผนก</InputLabel>
                <Select
                  value={selectedDepartment}
                  label="แผนก"
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                >
                  <MenuItem value="all">ทุกแผนก</MenuItem>
                  {dashboardData.departments.map(dept => (
                    <MenuItem key={dept.id} value={dept.name}>
                      {dept.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>สถานะ</InputLabel>
                <Select
                  value={selectedStatus}
                  label="สถานะ"
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                  <MenuItem value="all">ทุกสถานะ</MenuItem>
                  {Object.entries(statusConfig).map(([status, config]) => (
                    <MenuItem key={status} value={status}>
                      {config.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </CardContent>
        </Card>

        {/* Statistics Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {Object.entries(dashboardData.statistics.byStatus).map(([status, count]) => {
            const config = statusConfig[status as keyof typeof statusConfig]
            if (!config) return null
            
            return (
              <Grid item xs={6} sm={4} md={2} key={status}>
                <Card sx={{ 
                  borderRadius: 2, 
                  boxShadow: 2,
                  border: selectedStatus === status ? 2 : 0,
                  borderColor: selectedStatus === status ? 'primary.main' : 'transparent',
                  cursor: 'pointer',
                  '&:hover': { boxShadow: 4 }
                }}
                onClick={() => setSelectedStatus(selectedStatus === status ? 'all' : status)}
                >
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <Badge badgeContent={count} color={config.color} max={99}>
                      <config.icon sx={{ fontSize: '2rem', color: `${config.color}.main` }} />
                    </Badge>
                    <Typography variant="h6" sx={{ fontWeight: 700, mt: 1 }}>
                      {count}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {config.label}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            )
          })}
        </Grid>

        {/* Department Statistics */}
        {Object.keys(dashboardData.statistics.byDepartment).length > 0 && (
          <Card sx={{ mb: 3, borderRadius: 2, boxShadow: 2 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                จำนวนรายการตามแผนก
              </Typography>
              <Grid container spacing={2}>
                {Object.entries(dashboardData.statistics.byDepartment).map(([dept, count]) => {
                  const IconComponent = departmentIcons[dept as keyof typeof departmentIcons] || Restaurant
                  return (
                    <Grid item xs={6} sm={3} key={dept}>
                      <Paper sx={{ 
                        p: 2, 
                        textAlign: 'center',
                        cursor: 'pointer',
                        border: selectedDepartment === dept ? 2 : 0,
                        borderColor: selectedDepartment === dept ? 'primary.main' : 'transparent',
                        '&:hover': { boxShadow: 3 }
                      }}
                      onClick={() => setSelectedDepartment(selectedDepartment === dept ? 'all' : dept)}
                      >
                        <IconComponent sx={{ fontSize: '2rem', color: 'primary.main', mb: 1 }} />
                        <Typography variant="h5" sx={{ fontWeight: 700 }}>
                          {count}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {dept}
                        </Typography>
                      </Paper>
                    </Grid>
                  )
                })}
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* Orders List */}
        <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
              ออเดอร์ ({filteredOrders.length})
            </Typography>
            
            <Grid container spacing={2}>
              {filteredOrders.map((order) => {
                const config = statusConfig[order.status as keyof typeof statusConfig]
                if (!config) return null
                
                return (
                  <Grid item xs={12} sm={6} md={4} key={order.id}>
                    <Card sx={{ 
                      borderRadius: 2, 
                      boxShadow: 1,
                      border: 1,
                      borderColor: `${config.color}.main`,
                      '&:hover': { boxShadow: 3 }
                    }}>
                      <CardContent sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                          <Box>
                            <Typography variant="h6" sx={{ fontWeight: 700 }}>
                              #{order.orderNumber}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {order.table ? `โต๊ะ ${order.table.number}` : 'QR Order'}
                            </Typography>
                          </Box>
                          <Chip 
                            label={config.label}
                            color={config.color}
                            size="small"
                            icon={<config.icon />}
                          />
                        </Box>
                        
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>ลูกค้า:</strong> {order.customerName || order.qrSession?.customerName || 'ไม่ระบุ'}
                        </Typography>
                        
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>รายการ:</strong> {order.items.length} รายการ
                        </Typography>
                        
                        <Typography variant="body2" sx={{ mb: 2 }}>
                          <strong>ยอดรวม:</strong> ฿{order.totalAmount.toFixed(2)}
                        </Typography>
                        
                        <Divider sx={{ my: 2 }} />
                        
                        <Stack direction="row" spacing={1} justifyContent="space-between">
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => {
                              setSelectedOrder(order)
                              setOrderDialog(true)
                            }}
                          >
                            ดูรายละเอียด
                          </Button>
                          
                          {config.action && (
                            <Button
                              size="small"
                              variant="contained"
                              color={config.color}
                              onClick={() => handleOrderAction(order.id, config.action!)}
                              startIcon={<PlayArrow />}
                            >
                              {config.action === 'confirm' && 'ยืนยัน'}
                              {config.action === 'start_preparing' && 'เริ่มทำ'}
                              {config.action === 'mark_ready' && 'พร้อม'}
                              {config.action === 'mark_delivered' && 'เสิร์ฟ'}
                            </Button>
                          )}
                          
                          {order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => {
                                setSelectedOrder(order)
                                setCancelDialog(true)
                              }}
                            >
                              <Cancel />
                            </IconButton>
                          )}
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                )
              })}
            </Grid>
            
            {filteredOrders.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="h6" color="text.secondary">
                  ไม่มีออเดอร์ที่ตรงกับเงื่อนไข
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Order Detail Dialog */}
        <Dialog open={orderDialog} onClose={() => setOrderDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            รายละเอียดออเดอร์ #{selectedOrder?.orderNumber}
          </DialogTitle>
          <DialogContent>
            {selectedOrder && (
              <Box>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  <strong>สถานะ:</strong> {statusConfig[selectedOrder.status as keyof typeof statusConfig]?.label}
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  <strong>ลูกค้า:</strong> {selectedOrder.customerName || selectedOrder.qrSession?.customerName || 'ไม่ระบุ'}
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  <strong>โต๊ะ:</strong> {selectedOrder.table ? `โต๊ะ ${selectedOrder.table.number}` : 'QR Order'}
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  <strong>เวลาสั่ง:</strong> {new Date(selectedOrder.orderedAt).toLocaleString('th-TH')}
                </Typography>
                
                <Divider sx={{ my: 2 }} />
                
                <Typography variant="h6" sx={{ mb: 2 }}>รายการอาหาร</Typography>
                {selectedOrder.items.map((item, index) => (
                  <Box key={item.id} sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="body1">
                      <strong>{item.menuItem.name}</strong> x {item.quantity}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      ราคา: ฿{item.price.toFixed(2)} | รวม: ฿{(item.price * item.quantity).toFixed(2)}
                    </Typography>
                    {item.menuItem.department && (
                      <Typography variant="body2" color="text.secondary">
                        แผนก: {item.menuItem.department.name}
                      </Typography>
                    )}
                    {item.notes && (
                      <Typography variant="body2" color="text.secondary">
                        หมายเหตุ: {item.notes}
                      </Typography>
                    )}
                  </Box>
                ))}
                
                <Box sx={{ mt: 2, p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
                  <Typography variant="h6">
                    ยอดรวมทั้งหมด: ฿{selectedOrder.totalAmount.toFixed(2)}
                  </Typography>
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOrderDialog(false)}>ปิด</Button>
          </DialogActions>
        </Dialog>

        {/* Cancel Order Dialog */}
        <Dialog open={cancelDialog} onClose={() => setCancelDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>ยกเลิกออเดอร์</DialogTitle>
          <DialogContent>
            <Typography variant="body1" sx={{ mb: 2 }}>
              คุณต้องการยกเลิกออเดอร์ #{selectedOrder?.orderNumber} หรือไม่?
            </Typography>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>เหตุผลในการยกเลิก</InputLabel>
              <Select
                value={cancelReason}
                label="เหตุผลในการยกเลิก"
                onChange={(e) => setCancelReason(e.target.value)}
              >
                <MenuItem value="ลูกค้าขอยกเลิก">ลูกค้าขอยกเลิก</MenuItem>
                <MenuItem value="วัตถุดิบหมด">วัตถุดิบหมด</MenuItem>
                <MenuItem value="ปัญหาทางเทคนิค">ปัญหาทางเทคนิค</MenuItem>
                <MenuItem value="อื่นๆ">อื่นๆ</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCancelDialog(false)}>ยกเลิก</Button>
            <Button 
              onClick={handleCancelOrder}
              color="error"
              variant="contained"
              disabled={!cancelReason}
            >
              ยืนยันการยกเลิก
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </>
  )
}

