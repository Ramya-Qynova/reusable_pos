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
import type { LowStockItem } from '../../../types/sales'

interface LowStockAlertsTableProps {
  items: LowStockItem[]
}

const getProductVisual = (name: string) => {
  const lower = name.toLowerCase()
  if (lower.includes('tomato')) {
    return <span className="text-sm select-none leading-none">🍅</span>
  }
  if (lower.includes('milk')) {
    return <span className="text-sm select-none leading-none">🥛</span>
  }
  if (lower.includes('rice')) {
    return <span className="text-sm select-none leading-none">🌾</span>
  }
  if (lower.includes('t-shirt') || lower.includes('shirt')) {
    return <span className="text-sm select-none leading-none">👕</span>
  }
  if (lower.includes('oil')) {
    return <span className="text-sm select-none leading-none">🍾</span>
  }
  return <span className="text-sm select-none leading-none">📦</span>
}

export const LowStockAlertsTable: React.FC<LowStockAlertsTableProps> = ({ items }) => {
  return (
    <Card className="h-full flex flex-col justify-between shadow-xs" noPadding>
      <div className="p-3.5 sm:p-4 pb-2.5 sm:pb-3 flex items-center justify-between border-b border-slate-100">
        <div>
          <h2 className="text-[17px] sm:text-[18px] font-bold text-slate-800 tracking-tight leading-tight">
            Low Stock Alerts
          </h2>
          <p className="text-[12px] text-slate-500 mt-0.5">Critical products requiring reorder</p>
        </div>
        <Link
          to="/inventory"
          className="text-[12.5px] sm:text-[13px] font-semibold text-[#D45060] hover:text-[#BD3E4E] transition-colors"
        >
          View All
        </Link>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Current Stock</TableHead>
              <TableHead>Minimum Stock</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-slate-50 border border-slate-200/80 flex items-center justify-center shrink-0 shadow-2xs">
                      {getProductVisual(item.productName)}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-[13px]">{item.productName}</p>
                      <p className="text-[11px] text-slate-400">{item.category}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-bold text-rose-600 text-[13px]">
                    {item.currentStock} {item.unit}
                  </span>
                </TableCell>
                <TableCell className="text-slate-600 text-[13px]">
                  {item.minimumStock} {item.unit}
                </TableCell>
                <TableCell>
                  <Badge variant="danger" size="sm">
                    {item.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}

export default LowStockAlertsTable
