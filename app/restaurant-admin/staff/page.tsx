'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select
} from '@mui/material'
import {
  Add,
  Edit,
  Delete,
  People,
  PersonAdd
} from '@mui/icons-material'
import { RestaurantNavbar } from '@/lib/components/RestaurantNavbar'
import { Footer } from '@/lib/components/Footer'
import { useTranslation } from 'react-i18next'

interface Role {
  id: string
  name: string
  description?: string
}

interface Staff {
  id: string
  email: string
  ownerName: string
  isStaff: boolean
  role: Role | null
  createdAt: string
  updatedAt: string
}

export default function StaffManagementPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { t } = useTranslation()
  
  const [staff, setStaff] = useState<Staff[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null)
  
  // Form states
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    ownerName: '',
    roleId: ''
  })
  const [formLoading, setFormLoading] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
  }, [session, status, router])

  useEffect(() => {
    if (session?.user?.id) {
      fetchData()
    }
  }, [session?.user?.id])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch staff
      const staffResponse = await fetch('/api/admin/staff')
      if (!staffResponse.ok) {
        throw new Error('Failed to fetch staff')
      }
      const staffData = await staffResponse.json()
      setStaff(staffData)

      // Fetch roles
      const rolesResponse = await fetch('/api/admin/roles')
      if (!rolesResponse.ok) {
        // Try to seed roles if they don't exist
        const seedResponse = await fetch('/api/admin/seed-roles', {
          method: 'POST'
        })
        if (seedResponse.ok) {
          const seedData = await seedResponse.json()
          setRoles(seedData.roles)
        } else {
          throw new Error('Failed to fetch or create roles')
        }
      } else {
        const rolesData = await rolesResponse.json()
        setRoles(rolesData)
      }

    } catch (error) {
      console.error('Error fetching data:', error)
      setError('Failed to load data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleAddStaff = async () => {
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setFormLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          ownerName: formData.ownerName,
          roleId: formData.roleId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create staff member')
      }

      const newStaff = await response.json()
      setStaff([newStaff, ...staff])
      setAddDialogOpen(false)
      setFormData({ email: '', password: '', confirmPassword: '', ownerName: '', roleId: '' })
      setSuccess('Staff member created successfully')

    } catch (error) {
      console.error('Error creating staff:', error)
      setError(error instanceof Error ? error.message : 'Failed to create staff member')
    } finally {
      setFormLoading(false)
    }
  }

  const handleEditStaff = async () => {
    if (!selectedStaff) return

    if (formData.password && formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setFormLoading(true)
    setError(null)

    try {
      const updateData: any = {
        email: formData.email,
        ownerName: formData.ownerName,
        roleId: formData.roleId
      }

      if (formData.password) {
        updateData.password = formData.password
      }

      const response = await fetch(`/api/admin/staff/${selectedStaff.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update staff member')
      }

      const updatedStaff = await response.json()
      setStaff(staff.map(s => s.id === selectedStaff.id ? updatedStaff : s))
      setEditDialogOpen(false)
      setSelectedStaff(null)
      setFormData({ email: '', password: '', confirmPassword: '', ownerName: '', roleId: '' })
      setSuccess('Staff member updated successfully')

    } catch (error) {
      console.error('Error updating staff:', error)
      setError(error instanceof Error ? error.message : 'Failed to update staff member')
    } finally {
      setFormLoading(false)
    }
  }

  const handleDeleteStaff = async () => {
    if (!selectedStaff) return

    setFormLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/staff/${selectedStaff.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete staff member')
      }

      setStaff(staff.filter(s => s.id !== selectedStaff.id))
      setDeleteDialogOpen(false)
      setSelectedStaff(null)
      setSuccess('Staff member deleted successfully')

    } catch (error) {
      console.error('Error deleting staff:', error)
      setError(error instanceof Error ? error.message : 'Failed to delete staff member')
    } finally {
      setFormLoading(false)
    }
  }

  const openEditDialog = (staffMember: Staff) => {
    setSelectedStaff(staffMember)
    setFormData({
      email: staffMember.email,
      password: '',
      confirmPassword: '',
      ownerName: staffMember.ownerName,
      roleId: staffMember.role?.id || ''
    })
    setEditDialogOpen(true)
  }

  const openDeleteDialog = (staffMember: Staff) => {
    setSelectedStaff(staffMember)
    setDeleteDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({ email: '', password: '', confirmPassword: '', ownerName: '', roleId: '' })
    setError(null)
  }

  if (status === 'loading' || loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          gap: 2
        }}
      >
        <CircularProgress size={40} />
        <Typography variant="h6">Loading...</Typography>
      </Box>
    )
  }

  if (!session) {
    return null
  }

  return (
    <>
      <RestaurantNavbar 
        backButton={{
          href: '/restaurant-admin',
          label: 'Back to Admin'
        }}
      />

      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <People sx={{ fontSize: 24, color: '#2E5E45' }} />
            <Typography variant="h5" sx={{ fontWeight: 600, color: '#2E5E45' }}>
              Staff Management
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: '#2E5E45', opacity: 0.7 }}>
            Manage your restaurant staff members and their roles
          </Typography>
        </Box>

        {/* Alerts */}
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

        {/* Add Staff Button */}
        <Box sx={{ mb: 3 }}>
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            onClick={() => {
              resetForm()
              setAddDialogOpen(true)
            }}
            sx={{
              background: 'linear-gradient(135deg, #A3DC9A 0%, #2E5E45 100%)',
              color: 'white',
              '&:hover': {
                background: 'linear-gradient(135deg, #2E5E45 0%, #1a3326 100%)'
              }
            }}
          >
            Add New Staff
          </Button>
        </Box>

        {/* Staff Table */}
        <Card elevation={4} sx={{ borderRadius: 4 }}>
          <CardContent>
            <TableContainer component={Paper} elevation={0}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Name</strong></TableCell>
                    <TableCell><strong>Email</strong></TableCell>
                    <TableCell><strong>Role</strong></TableCell>
                    <TableCell><strong>Type</strong></TableCell>
                    <TableCell><strong>Created</strong></TableCell>
                    <TableCell><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {staff.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>{member.ownerName}</TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell>
                        {member.role ? (
                          <Chip 
                            label={member.role.name} 
                            size="small"
                            color={member.role.name === 'Admin' ? 'error' : 'primary'}
                          />
                        ) : (
                          <Chip label="No Role" size="small" color="default" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={member.isStaff ? 'Staff' : 'Owner'} 
                          size="small"
                          color={member.isStaff ? 'info' : 'warning'}
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(member.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => openEditDialog(member)}
                          color="primary"
                        >
                          <Edit />
                        </IconButton>
                        {member.isStaff && (
                          <IconButton
                            size="small"
                            onClick={() => openDeleteDialog(member)}
                            color="error"
                          >
                            <Delete />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {staff.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography variant="body2" color="text.secondary">
                          No staff members found. Add your first staff member to get started.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        {/* Add Staff Dialog */}
        <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Add New Staff Member</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                label="Full Name"
                value={formData.ownerName}
                onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                required
                fullWidth
              />
              <TextField
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                fullWidth
              />
              <TextField
                label="Password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                fullWidth
                helperText="Minimum 6 characters"
              />
              <TextField
                label="Confirm Password"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                fullWidth
              />
              <FormControl fullWidth required>
                <InputLabel>Role</InputLabel>
                <Select
                  value={formData.roleId}
                  onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                  label="Role"
                >
                  {roles.map((role) => (
                    <MenuItem key={role.id} value={role.id}>
                      {role.name} {role.description && `- ${role.description}`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleAddStaff} 
              variant="contained"
              disabled={formLoading}
            >
              {formLoading ? <CircularProgress size={20} /> : 'Add Staff'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Staff Dialog */}
        <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Edit Staff Member</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                label="Full Name"
                value={formData.ownerName}
                onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                required
                fullWidth
              />
              <TextField
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                fullWidth
              />
              <TextField
                label="New Password (optional)"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                fullWidth
                helperText="Leave blank to keep current password"
              />
              {formData.password && (
                <TextField
                  label="Confirm New Password"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  fullWidth
                />
              )}
              <FormControl fullWidth required>
                <InputLabel>Role</InputLabel>
                <Select
                  value={formData.roleId}
                  onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                  label="Role"
                >
                  {roles.map((role) => (
                    <MenuItem key={role.id} value={role.id}>
                      {role.name} {role.description && `- ${role.description}`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleEditStaff} 
              variant="contained"
              disabled={formLoading}
            >
              {formLoading ? <CircularProgress size={20} /> : 'Update Staff'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete {selectedStaff?.ownerName}? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleDeleteStaff} 
              color="error" 
              variant="contained"
              disabled={formLoading}
            >
              {formLoading ? <CircularProgress size={20} /> : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>

      <Footer />
    </>
  )
}

