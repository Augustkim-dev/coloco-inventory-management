'use client'

import { Supplier } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, User, Phone, Mail, MapPin, FileText } from 'lucide-react'

interface SupplierInfoProps {
  supplier: Supplier
}

export function SupplierInfo({ supplier }: SupplierInfoProps) {
  const infoItems = [
    {
      icon: Building2,
      label: 'Company Name',
      value: supplier.name,
    },
    {
      icon: User,
      label: 'Contact Person',
      value: supplier.contact_person || '-',
    },
    {
      icon: Phone,
      label: 'Phone',
      value: supplier.phone || '-',
    },
    {
      icon: Mail,
      label: 'Email',
      value: supplier.email || '-',
    },
    {
      icon: MapPin,
      label: 'Address',
      value: supplier.address || '-',
    },
  ]

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {infoItems.map((item) => {
            const Icon = item.icon
            return (
              <div key={item.label} className="flex items-start gap-3">
                <Icon className="h-5 w-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500">
                    {item.label}
                  </p>
                  <p className="text-sm mt-1">{item.value}</p>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {supplier.notes || 'No notes available.'}
          </p>
        </CardContent>
      </Card>

      {/* Metadata */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Metadata</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-gray-500">Created At</p>
            <p className="text-sm mt-1">
              {new Date(supplier.created_at).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Last Updated</p>
            <p className="text-sm mt-1">
              {new Date(supplier.updated_at).toLocaleString()}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
