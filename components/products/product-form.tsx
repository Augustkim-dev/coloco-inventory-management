'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Product } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { PRODUCT_UNITS, PRODUCT_CATEGORIES } from '@/lib/constants'
import { isValidSKU } from '@/lib/utils'

interface ProductFormProps {
  product?: Product
  mode: 'create' | 'edit'
}

export function ProductForm({ product, mode }: ProductFormProps) {
  const [formData, setFormData] = useState({
    sku: product?.sku || '',
    name: product?.name || '',
    name_ko: product?.name_ko || '',
    name_vn: product?.name_vn || '',
    name_cn: product?.name_cn || '',
    category: product?.category || '',
    unit: product?.unit || 'EA',
    shelf_life_days: product?.shelf_life_days || 730,
    description: product?.description || '',
  })
  const [loading, setLoading] = useState(false)
  const [skuError, setSkuError] = useState('')
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  // SKU duplicate check
  const checkSKU = async (sku: string) => {
    if (!sku || sku === product?.sku) {
      setSkuError('')
      return true
    }

    if (!isValidSKU(sku)) {
      setSkuError('SKU must contain only uppercase letters, numbers, and hyphens')
      return false
    }

    const { data } = await supabase
      .from('products')
      .select('id')
      .eq('sku', sku)
      .maybeSingle()

    if (data) {
      setSkuError('SKU already exists')
      return false
    }

    setSkuError('')
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // SKU validation
    const isValidSKUCheck = await checkSKU(formData.sku)
    if (!isValidSKUCheck) return

    // Shelf life validation
    if (formData.shelf_life_days <= 0) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Shelf life must be greater than 0',
      })
      return
    }

    setLoading(true)

    try {
      if (mode === 'create') {
        const { error } = await supabase.from('products').insert([formData])

        if (error) throw error

        toast({
          title: 'Success',
          description: 'Product created successfully',
        })
      } else {
        const { error } = await supabase
          .from('products')
          .update(formData)
          .eq('id', product!.id)

        if (error) throw error

        toast({
          title: 'Success',
          description: 'Product updated successfully',
        })
      }

      router.push('/products')
      router.refresh()
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {mode === 'create' ? 'Add New Product' : 'Edit Product'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* SKU & Name */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sku">
                SKU <span className="text-red-500">*</span>
              </Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase()
                  setFormData({ ...formData, sku: value })
                }}
                onBlur={(e) => checkSKU(e.target.value)}
                required
                placeholder="PRD-001"
                disabled={mode === 'edit'} // SKU cannot be edited
                className={mode === 'edit' ? 'bg-gray-50' : ''}
              />
              {skuError && (
                <p className="text-sm text-red-500 mt-1">{skuError}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Uppercase letters, numbers, and hyphens only
              </p>
            </div>

            <div>
              <Label htmlFor="name">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                placeholder="Product name"
              />
            </div>
          </div>

          {/* Multilingual names */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="name_ko">Korean Name</Label>
              <Input
                id="name_ko"
                value={formData.name_ko}
                onChange={(e) =>
                  setFormData({ ...formData, name_ko: e.target.value })
                }
                placeholder="제품명"
              />
            </div>
            <div>
              <Label htmlFor="name_vn">Vietnamese Name</Label>
              <Input
                id="name_vn"
                value={formData.name_vn}
                onChange={(e) =>
                  setFormData({ ...formData, name_vn: e.target.value })
                }
                placeholder="Tên sản phẩm"
              />
            </div>
            <div>
              <Label htmlFor="name_cn">Chinese Name</Label>
              <Input
                id="name_cn"
                value={formData.name_cn}
                onChange={(e) =>
                  setFormData({ ...formData, name_cn: e.target.value })
                }
                placeholder="产品名称"
              />
            </div>
          </div>

          {/* Category, Unit, Shelf Life */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData({ ...formData, category: value })
                }
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="unit">
                Unit <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.unit}
                onValueChange={(value) =>
                  setFormData({ ...formData, unit: value })
                }
              >
                <SelectTrigger id="unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_UNITS.map((unit) => (
                    <SelectItem key={unit.value} value={unit.value}>
                      {unit.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="shelf_life_days">
                Shelf Life (days) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="shelf_life_days"
                type="number"
                value={formData.shelf_life_days}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    shelf_life_days: parseInt(e.target.value) || 0,
                  })
                }
                required
                min="1"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={4}
              placeholder="Product description"
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={loading || !!skuError}>
              {loading ? 'Saving...' : mode === 'create' ? 'Create' : 'Save Changes'}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
