export function DataTable({ columns, rows }: { columns: readonly string[]; rows: readonly (readonly string[])[] }) {
  return <div className="tableWrap"><table className="dataTable"><thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{rows.map((row, rowIndex) => <tr key={`${row[0]}-${rowIndex}`}>{row.map((cell, index) => <td key={`${cell}-${index}`}>{index === row.length - 1 ? <span className="tableStatus">{cell}</span> : cell}</td>)}</tr>)}</tbody></table></div>;
}
