import MuiTable, { type TableProps } from "@mui/material/Table";
import MuiTableBody, { type TableBodyProps } from "@mui/material/TableBody";
import MuiTableCell, { type TableCellProps } from "@mui/material/TableCell";
import MuiTableContainer from "@mui/material/TableContainer";
import MuiTableHead, { type TableHeadProps } from "@mui/material/TableHead";
import MuiTableRow, { type TableRowProps } from "@mui/material/TableRow";

// 026's MUI Migration — every existing call site keeps this codebase's
// own component names (Table/TableHeader/TableBody/TableRow/TableHead/
// TableCell), even though MUI's own naming differs (MUI's `TableHead` is
// the `<thead>` section, not a single `<th>` cell the way this codebase's
// `TableHead` always meant) — only the internals swap. `TableFooter`/
// `TableCaption` are dropped outright rather than kept as unused exports:
// grepping the whole app found zero call sites for either.

function Table(props: TableProps) {
  return (
    <MuiTableContainer>
      <MuiTable {...props} />
    </MuiTableContainer>
  );
}

function TableHeader(props: TableHeadProps) {
  return <MuiTableHead {...props} />;
}

function TableBody(props: TableBodyProps) {
  return <MuiTableBody {...props} />;
}

function TableRow(props: TableRowProps) {
  return <MuiTableRow {...props} />;
}

// This codebase's own `<th>`-rendering cell — MUI's `TableCell` renders as
// `<td>` by default, so `component="th"` forces the same semantic element
// every existing sortable-column-header call site already relies on.
function TableHead(props: TableCellProps) {
  return <MuiTableCell component="th" {...props} />;
}

function TableCell(props: TableCellProps) {
  return <MuiTableCell {...props} />;
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
