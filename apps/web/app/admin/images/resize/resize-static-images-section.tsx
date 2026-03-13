"use client";

import { useState } from "react";
import { Button } from "@workspace/ui/components/button";

type ListItem = {
  path: string;
  exists: boolean;
  displayWidth: number;
  currentWidth?: number;
  targetWidth: number;
  needsResize: boolean;
  isUnused?: boolean;
  error?: string;
};

type ListResponse = {
  items: ListItem[];
};

type ResizedItem = {
  path: string;
  originalWidth: number;
  newWidth: number;
};

type PostResponse = {
  resized: ResizedItem[];
  skipped: number;
  errors?: string[];
};

export function ResizeStaticImagesSection() {
  const [listLoading, setListLoading] = useState(false);
  const [list, setList] = useState<ListItem[] | null>(null);
  const [runLoading, setRunLoading] = useState(false);
  const [result, setResult] = useState<PostResponse | null>(null);
  const [unusedLoading, setUnusedLoading] = useState(false);
  const [unusedList, setUnusedList] = useState<string[] | null>(null);
  const [deletingPath, setDeletingPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFetchList = async () => {
    setError(null);
    setList(null);
    setListLoading(true);
    try {
      const res = await fetch("/api/admin/resize-static-images", {
        method: "GET",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "조회에 실패했습니다.");
      }
      setList((data as ListResponse).items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "조회에 실패했습니다.");
    } finally {
      setListLoading(false);
    }
  };

  const handleRun = async () => {
    setError(null);
    setResult(null);
    setRunLoading(true);
    try {
      const res = await fetch("/api/admin/resize-static-images", {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "요청에 실패했습니다.");
      }
      setResult(data as PostResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "요청에 실패했습니다.");
    } finally {
      setRunLoading(false);
    }
  };

  const handleFetchUnused = async () => {
    setError(null);
    setUnusedList(null);
    setUnusedLoading(true);
    try {
      const res = await fetch("/api/admin/delete-unused-static-images", {
        method: "GET",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "조회에 실패했습니다.");
      }
      setUnusedList((data as { items: string[] }).items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "조회에 실패했습니다.");
    } finally {
      setUnusedLoading(false);
    }
  };

  const handleDeleteOne = async (
    pathToDelete: string,
    onSuccess?: () => void,
  ) => {
    if (!window.confirm(`다음 파일을 삭제할까요?\n${pathToDelete}`)) return;
    setError(null);
    setDeletingPath(pathToDelete);
    try {
      const res = await fetch("/api/admin/delete-unused-static-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: pathToDelete }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "삭제에 실패했습니다.");
      }
      setUnusedList((prev) =>
        prev ? prev.filter((p) => p !== pathToDelete) : null,
      );
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "삭제에 실패했습니다.");
    } finally {
      setDeletingPath(null);
    }
  };

  return (
    <section className="space-y-6 rounded-lg border p-4">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleFetchList}
          disabled={listLoading}
        >
          {listLoading ? "조회 중…" : "이미지 조회"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={handleRun}
          disabled={runLoading}
        >
          {runLoading ? "처리 중…" : "리사이즈 일괄 수행"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleFetchUnused}
          disabled={unusedLoading}
        >
          {unusedLoading ? "조회 중…" : "미사용 이미지 보기"}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {list && (
        <div className="space-y-2">
          <p className="text-sm font-medium">
            {list.length === 0
              ? "등록된 고정 이미지가 없습니다."
              : `고정 이미지 ${list.length}건`}
          </p>
          {list.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[400px] text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 pr-2 font-medium">이미지</th>
                    <th className="pb-2 pr-2 font-medium">경로</th>
                    <th className="pb-2 pr-2 font-medium">사용폭</th>
                    <th className="pb-2 pr-2 font-medium">현재 폭</th>
                    <th className="pb-2 pr-2 font-medium">목표 폭</th>
                    <th className="pb-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {list.map((item) => (
                    <tr key={item.path} className="border-b">
                      <td className="py-1.5 pr-2 align-middle">
                        {item.exists ? (
                          <img
                            src={item.path}
                            alt=""
                            className="h-10 w-10 shrink-0 rounded border object-cover"
                          />
                        ) : (
                          <span className="inline-flex h-10 w-10 items-center justify-center rounded border bg-muted text-xs text-muted-foreground">
                            없음
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 pr-2 text-muted-foreground">
                        {item.path}
                      </td>
                      <td className="py-1.5 pr-2">{item.displayWidth}px</td>
                      <td className="py-1.5 pr-2">
                        {item.currentWidth != null
                          ? `${item.currentWidth}px`
                          : "-"}
                      </td>
                      <td className="py-1.5 pr-2">{item.targetWidth}px</td>
                      <td className="py-1.5">
                        {item.exists ? (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() =>
                              handleDeleteOne(item.path, handleFetchList)
                            }
                            disabled={deletingPath !== null}
                          >
                            {deletingPath === item.path
                              ? "삭제 중…"
                              : "삭제"}
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {result?.errors && result.errors.length > 0 && (
        <ul className="text-sm text-destructive" role="alert">
          {result.errors.map((msg, i) => (
            <li key={i}>{msg}</li>
          ))}
        </ul>
      )}

      {unusedList && (
        <div className="space-y-2">
          <p className="text-sm font-medium">
            {unusedList.length === 0
              ? "미사용 이미지가 없습니다."
              : `미사용 이미지 ${unusedList.length}건`}
          </p>
          {unusedList.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[280px] text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 pr-2 font-medium">이미지</th>
                    <th className="pb-2 pr-2 font-medium">경로</th>
                    <th className="pb-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {unusedList.map((p) => (
                    <tr key={p} className="border-b">
                      <td className="py-1.5 pr-2 align-middle">
                        <img
                          src={p}
                          alt=""
                          className="h-10 w-10 shrink-0 rounded border object-cover"
                        />
                      </td>
                      <td className="py-1.5 pr-2 text-muted-foreground">{p}</td>
                      <td className="py-1.5">
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteOne(p)}
                          disabled={deletingPath !== null}
                        >
                          {deletingPath === p ? "삭제 중…" : "삭제"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {result && (
        <div className="space-y-2">
          <p className="text-sm font-medium">
            {result.resized.length === 0
              ? "리사이즈한 파일이 없습니다."
              : `리사이즈 완료: ${result.resized.length}개 (스킵 ${result.skipped}개)`}
          </p>
          {result.resized.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[280px] text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 pr-2 font-medium">경로</th>
                    <th className="pb-2 pr-2 font-medium">원본 가로</th>
                    <th className="pb-2 font-medium">리사이즈 후</th>
                  </tr>
                </thead>
                <tbody>
                  {result.resized.map((item) => (
                    <tr key={item.path} className="border-b">
                      <td className="py-1.5 pr-2 text-muted-foreground">
                        {item.path}
                      </td>
                      <td className="py-1.5 pr-2">{item.originalWidth}px</td>
                      <td className="py-1.5">{item.newWidth}px</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
