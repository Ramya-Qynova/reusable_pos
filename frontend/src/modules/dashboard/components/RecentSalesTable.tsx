import React from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../../../components/common/Card'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '../../../components/common/Table'
import { Badge } from '../../../components/common/Badge'
import { formatCurrency } from '../../../utils/formatters'
import type { RecentSale } from '../../../types/sales'

interface RecentSalesTableProps {
  sales: RecentSale[]
}

export const RecentSalesTable: React.FC<RecentSalesTableProps> = ({ sales }) => {
  const getStatusBadge = (status: RecentSale['status']) => {
    switch (status) {
      case 'Completed':
        return <Badge variant="success" size="sm">Completed</Badge>
      case 'Pending':
        return <Badge variant="warning" size="sm">Pending</Badge>
      case 'Cancelled':
        return <Badge variant="danger" size="sm">Cancelled</Badge>
      default:
        return <Badge variant="neutral" size="sm">{status}</Badge>
    }
  }

  const getPaymentBadge = (method: RecentSale['paymentMethod']) => {
    switch (method) {
      case 'UPI':
        return <span className="text-[11.5px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded">UPI</span>
      case 'Cash':
        return <span className="text-[11.5px] font-semibold text-blue-700 bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded">Cash</span>
      case 'Card':
        return <span className="text-[11.5px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded">Card</span>
      case 'Online':
        return <span className="text-[11.5px] font-semibold text-purple-700 bg-purple-50 border border-purple-200/60 px-2 py-0.5 rounded">Online</span>
    }
  }

  return (
    <Card className="h-full flex flex-col justify-between shadow-xs" noPadding>
      <div className="p-3.5 sm:p-4 pb-2.5 sm:pb-3 flex items-center justify-between border-b border-slate-100">
        <div>
          <h2 className="text-[17px] sm:text-[18px] font-bold text-slate-800 tracking-tight leading-tight">
            Recent Sales
          </h2>
          <p className="text-[12px] text-slate-500 mt-0.5">Live store transactions recorded today</p>
        </div>
        <Link
          to="/sales"
          className="text-[12.5px] sm:text-[13px] font-semibold text-[#D45060] hover:text-[#BD3E4E] transition-colors"
        >
          View All
        </Link>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice No.</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales.map((sale) => (
              <TableRow key={sale.id}>
                <TableCell>
                  <span className="font-semibold text-[#D45060] hover:underline cursor-pointer">
                    {sale.invoiceNumber}
                  </span>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-semibold text-slate-800 text-[13px]">{sale.customerName}</p>
                    {sale.customerCategory && (
                      <p className="text-[11px] text-slate-400">{sale.customerCategory}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-extrabold text-slate-800 text-[13px]">
                    {formatCurrency(sale.amount)}
                  </span>
                </TableCell>
                <TableCell>{getPaymentBadge(sale.paymentMethod)}</TableCell>
                <TableCell className="text-slate-500 font-mono text-[12px]">
                  {sale.timestamp}
                </TableCell>
                <TableCell>{getStatusBadge(sale.status)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}

export default RecentSalesTable
