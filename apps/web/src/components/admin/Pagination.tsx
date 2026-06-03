import { Button } from "@/components/ui/button";

/**
 * Compact prev/current/next pager shared by the admin list pages. Mirrors the
 * footer that the Order/User tables already use so every list looks the same.
 */
export function Pagination({
  page,
  total,
  pageSize,
  onPage
}: {
  page: number;
  total: number;
  pageSize: number;
  onPage: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex items-center justify-end gap-1 px-4 py-3 text-xs">
      <span className="mr-auto text-muted-foreground">共 {total} 条</span>
      <Button
        size="sm"
        variant="ghost"
        className="size-7 p-0"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        ‹
      </Button>
      <span className="inline-flex size-7 items-center justify-center rounded border border-primary bg-white text-primary">
        {page}
      </span>
      <Button
        size="sm"
        variant="ghost"
        className="size-7 p-0"
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
      >
        ›
      </Button>
      <span className="ml-2 inline-flex items-center text-muted-foreground">
        {pageSize} 条 / 页
      </span>
    </div>
  );
}
