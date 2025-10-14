'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { ArrowUpDown, MoreHorizontal, PlusCircle, Pencil, Trash2, Plus } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/page-header';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';

type Product = {
  id: string;
  name: string;
  qty: number;
  cost_price: number;
  retail_price: number;
  wholesale_price: number | null;
  min_wholesale_qty: number | null;
  barcode: string | null;
  exp_date: string | null;
  created_at: string;
  updated_at: string;
  is_editable: boolean;
};

const formatRupiah = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
};

const columns = (handleDelete: (id: string) => void): ColumnDef<Product>[] => [
  {
    accessorKey: 'id',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="p-0 hover:bg-transparent"
        >
          ID
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => (
      <div className="font-mono text-sm">{row.getValue('id')}</div>
    ),
  },
  {
    accessorKey: 'name',
    header: () => <div className="text-left">Nama Produk</div>,
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue('name')}</div>
    ),
  },
  {
    accessorKey: 'qty',
    header: () => <div className="text-center">Stok</div>,
    cell: ({ row }) => (
      <div className="text-center">{row.getValue('qty')}</div>
    ),
  },
  {
    accessorKey: 'retail_box_price',
    header: () => <div className="text-right">Harga Jual Unit</div>,
    cell: ({ row }) => {
      const amount = row.getValue('retail_box_price');
      if (!amount) return <div className="text-right">-</div>;
      return <div className="text-right">{formatRupiah(amount as number)}</div>;
    },
  },
  {
    accessorKey: 'wholesale_price',
    header: () => <div className="text-right">Harga Grosir</div>,
    cell: ({ row }) => {
      const amount = row.getValue('wholesale_price');
      if (!amount) return <div className="text-center">-</div>;
      return <div className="text-right">{formatRupiah(amount as number)}</div>;
    },
  },
  {
    accessorKey: 'retail_price',
    header: () => <div className="text-right">Harga Jual Ecer</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('retail_price'));
      return <div className="text-right">{formatRupiah(amount)}</div>;
    },
  },
  {
    accessorKey: 'barcode',
    header: () => <div className="text-center">Barcode</div>,
    cell: ({ row }) => (
      <div className="text-center">{row.getValue('barcode') || '-'}</div>
    ),
  },
  {
    id: 'actions',
    header: () => <div className="text-center">Aksi</div>,
    enableHiding: false,
    cell: ({ row }) => {
      const product = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <Link href={`/products/${product.id}/edit`}>
              <DropdownMenuItem>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
            </Link>
            <Link href={`/products/${product.id}/add-stock`}>
              <DropdownMenuItem>
                <PlusCircle className="mr-2 h-4 w-4" />
                Tambah Stok
              </DropdownMenuItem>
            </Link>
            <DropdownMenuItem
              onClick={() => handleDelete(product.id)}
              className="text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

export default function ProductsPage() {
  const [products, setProducts] = React.useState<Product[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  React.useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      if (!response.ok) throw new Error('Gagal memuat produk');
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Gagal memuat daftar produk');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus produk ini?')) return;
    
    try {
      const response = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Gagal menghapus produk');
      }

      setProducts(products.filter(product => product.id !== id));
      toast.success('Produk berhasil dihapus');
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Gagal menghapus produk');
    }
  };

  const table = useReactTable({
    data: products,
    columns: columns(handleDelete),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  if (isLoading) {
    return <div className="container mx-auto py-6">Memuat...</div>;
  }

  return (
    <div className="space-y-4">
      <PageHeader 
        title="Daftar Produk"
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <Button asChild className="w-full md:w-auto">
          <Link href="/products/add">
            <Plus className="mr-2 h-4 w-4" />
            Tambah Produk
          </Link>
        </Button>
      </PageHeader>

      <div className="flex items-center py-4">
        <Input
          placeholder="Cari produk..."
          value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
          onChange={(event) =>
            table.getColumn('name')?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Tidak ada data.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="text-sm text-muted-foreground">
          Menampilkan {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} - {
            Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              table.getFilteredRowModel().rows.length
            )
          } dari {table.getFilteredRowModel().rows.length} produk
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Sebelumnya
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Selanjutnya
          </Button>
        </div>
      </div>
    </div>
  );
}
