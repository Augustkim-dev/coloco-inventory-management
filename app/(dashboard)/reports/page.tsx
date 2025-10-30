import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import Link from 'next/link'
import { FileText, Package, TrendingUp } from 'lucide-react'

const reports = [
  {
    title: 'Sales Report',
    description: 'View daily sales by branch and product',
    icon: TrendingUp,
    href: '/reports/sales',
  },
  {
    title: 'Inventory Report',
    description: 'View current stock by location and batch',
    icon: Package,
    href: '/reports/inventory',
  },
  {
    title: 'Transaction History',
    description: 'View all purchase orders and transfers',
    icon: FileText,
    href: '/reports/transactions',
  },
]

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">
          View comprehensive reports on sales, inventory, and transactions
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => {
          const Icon = report.icon
          return (
            <Link key={report.href} href={report.href}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{report.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">{report.description}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
