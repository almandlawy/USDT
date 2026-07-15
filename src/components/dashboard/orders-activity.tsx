import Link from "next/link";
import type { Locale } from "@/lib/constants";
import { orderStatusLabel, statusTone } from "@/lib/order-display";
import { formatFiatAmount, formatOrderDate, orderTypeLabel } from "@/lib/status-labels";
import { StatusBadge } from "@/components/ui/status-badge";

export type ActivityOrder = {
  id: string;
  reference_number: string;
  order_type: string;
  amount_fiat: number | string;
  fiat_currency: string;
  network: string;
  status: string;
  created_at: string;
};

export function OrdersActivity({
  locale,
  orders,
}: {
  locale: Locale;
  orders: ActivityOrder[];
}) {
  const ar = locale === "ar";

  return (
    <>
      <div className="tableWrap desktopOrdersTable">
        <table className="dataTable">
          <thead>
            <tr>
              {(ar
                ? ["المرجع", "النوع", "المبلغ", "الشبكة", "الحالة", "تاريخ الإنشاء"]
                : ["Reference", "Type", "Amount", "Network", "Status", "Created"]
              ).map((column) => <th key={column}>{column}</th>)}
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>
                  <Link className="tableLink" href={`/${locale}/dashboard/orders/${order.id}`}>
                    {order.reference_number}
                  </Link>
                </td>
                <td>{orderTypeLabel(order.order_type, locale)}</td>
                <td>{formatFiatAmount(Number(order.amount_fiat), order.fiat_currency, locale)}</td>
                <td>{order.network}</td>
                <td><StatusBadge tone={statusTone(order.status)}>{orderStatusLabel(order.status, locale)}</StatusBadge></td>
                <td>{formatOrderDate(order.created_at, locale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mobileOrderCards">
        {orders.map((order) => (
          <Link className="mobileOrderCard" href={`/${locale}/dashboard/orders/${order.id}`} key={order.id}>
            <span className="mobileOrderTop">
              <b>{order.reference_number}</b>
              <StatusBadge tone={statusTone(order.status)}>{orderStatusLabel(order.status, locale)}</StatusBadge>
            </span>
            <span>{orderTypeLabel(order.order_type, locale)} · {formatFiatAmount(Number(order.amount_fiat), order.fiat_currency, locale)}</span>
            <small>{order.network} · {formatOrderDate(order.created_at, locale)}</small>
          </Link>
        ))}
      </div>
    </>
  );
}
