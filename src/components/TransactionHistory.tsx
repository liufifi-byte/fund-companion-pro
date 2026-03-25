import { Transaction } from "@/types/transaction";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface TransactionHistoryProps {
  transactions: Transaction[];
}

export default function TransactionHistory({ transactions }: TransactionHistoryProps) {
  if (transactions.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t">
      <div className="text-xs text-muted-foreground mb-2">交易流水</div>
      <div className="overflow-x-auto -mx-1">
        <Table>
          <TableHeader>
            <TableRow className="border-b-0">
              <TableHead className="h-7 px-2 text-[10px]">日期</TableHead>
              <TableHead className="h-7 px-2 text-[10px]">方向</TableHead>
              <TableHead className="h-7 px-2 text-[10px] text-right">单价</TableHead>
              <TableHead className="h-7 px-2 text-[10px] text-right">数量</TableHead>
              <TableHead className="h-7 px-2 text-[10px] text-right">手续费</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((tx) => (
              <TableRow key={tx.id} className="border-b-0">
                <TableCell className="py-1 px-2 text-[11px] tabular text-muted-foreground">
                  {tx.date}
                </TableCell>
                <TableCell className="py-1 px-2">
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                    tx.type === "BUY"
                      ? "bg-primary/10 text-primary"
                      : "bg-destructive/10 text-destructive"
                  }`}>
                    {tx.type === "BUY" ? "买入" : "卖出"}
                  </span>
                </TableCell>
                <TableCell className="py-1 px-2 text-[11px] tabular text-right text-card-foreground">
                  {tx.price.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                </TableCell>
                <TableCell className="py-1 px-2 text-[11px] tabular text-right text-card-foreground">
                  {tx.quantity.toLocaleString("zh-CN", { minimumFractionDigits: 0, maximumFractionDigits: 4 })}
                </TableCell>
                <TableCell className="py-1 px-2 text-[11px] tabular text-right text-muted-foreground">
                  {tx.fee.toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
