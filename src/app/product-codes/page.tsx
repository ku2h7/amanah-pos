'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';

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
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

type ProductCode = {
  id: number;
  keyword: string;
  code_prefix: string;
  description: string | null;
};

const columns: ColumnDef<ProductCode>[] = [
  {
    accessorKey: 'keyword',
    header: 'Keyword',
  },
  {
    accessorKey: 'code_prefix',
    header: 'Prefix Kode',
  },
  {
    accessorKey: 'description',
    header: 'Deskripsi',
    cell: ({ row }) => (
      <div>{row.getValue('description') || '-'}</div>
    ),
  },
  {
    id: 'actions',
    enableHiding: false,
    cell: ({ row }) => {
      const productCode = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                // TODO: Implement edit functionality
                toast.info('Fitur edit akan segera hadir');
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={async () => {
                if (window.confirm('Apakah Anda yakin ingin menghapus kode produk ini?')) {
                  try {
                    const response = await fetch(`/api/product-codes/${productCode.id}`, {
                      method: 'DELETE',
                    });

                    if (!response.ok) {
                      throw new Error('Gagal menghapus kode produk');
                    }

                    window.location.reload();
                    toast.success('Kode produk berhasil dihapus');
                  } catch (error) {
                    console.error('Error deleting product code:', error);
                    toast.error('Gagal menghapus kode produk');
                  }
                }
              }}
              className="text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Hapus
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

export default function ProductCodesPage() {
  const [productCodes, setProductCodes] = React.useState<ProductCode[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [keyword, setKeyword] = React.useState('');
  const [codePrefix, setCodePrefix] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const dialogTriggerRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    fetchProductCodes();
  }, []);

  const fetchProductCodes = async () => {
    try {
      const response = await fetch('/api/product-codes');
      if (!response.ok) throw new Error('Gagal memuat kode produk');
      const data = await response.json();
      setProductCodes(data);
    } catch (error) {
      console.error('Error fetching product codes:', error);
      toast.error('Gagal memuat daftar kode produk');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/product-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyword,
          code_prefix: codePrefix,
          description: description || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Gagal menambahkan kode produk');
      }

      const newCode = await response.json();
      setProductCodes([...productCodes, newCode]);
      setKeyword('');
      setCodePrefix('');
      setDescription('');
      if (dialogTriggerRef.current) {
        dialogTriggerRef.current.focus();
      }
      toast.success('Kode produk berhasil ditambahkan');
    } catch (error) {
      console.error('Error adding product code:', error);
      toast.error(error instanceof Error ? error.message : 'Gagal menambahkan kode produk');
    } finally {
      setIsSubmitting(false);
    }
  };

  const table = useReactTable({
    data: productCodes,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  });

  return (
    <div className="container mx-auto space-y-6">
      <PageHeader 
        title="Kode Produk"
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <Dialog>
          <DialogTrigger asChild>
            <Button ref={dialogTriggerRef}>
              <Plus className="mr-2 h-4 w-4" />
              Tambah Kode
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah Kode Produk</DialogTitle>
              <DialogDescription>
                Tambahkan kode produk baru untuk memudahkan manajemen inventaris
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="keyword">Keyword</Label>
                <Input
                  id="keyword"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Contoh: mie, beras, telur"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code_prefix">Prefix Kode</Label>
                <Input
                  id="code_prefix"
                  value={codePrefix}
                  onChange={(e) => setCodePrefix(e.target.value.toUpperCase())}
                  placeholder="Contoh: MI, BR, TL"
                  maxLength={5}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Deskripsi (Opsional)</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Contoh: Mie Instan, Beras, Telur"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { 
                    if (dialogTriggerRef.current) {
                      dialogTriggerRef.current.focus();
                    }
                  }}
                  disabled={isSubmitting}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Memuat...
                </TableCell>
              </TableRow>
            ) : productCodes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Tidak ada data kode produk
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
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
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          Menampilkan {table.getRowModel().rows.length > 0 ? (table.getState().pagination.pageIndex * table.getState().pagination.pageSize) + 1 : 0}-{
            Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              productCodes.length
            )
          } dari {productCodes.length} kode produk
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
