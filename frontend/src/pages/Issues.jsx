import { useEffect, useState } from 'react';
import IssueFilters from '../components/issues/IssueFilters';
import IssueCard from '../components/issues/IssueCard';
import { Pagination } from '../components/common/Pagination';
import { EmptyState, Spinner } from '../components/common/Button';
import { fetchIssues } from '../services/issues';
import { fetchMeta } from '../services/meta';

export default function Issues() {
  const [meta, setMeta] = useState({ categories: [], departments: [] });
  const [filters, setFilters] = useState({});
  const [result, setResult] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMeta().then((m) => setMeta(m)).catch(() => {});
  }, []);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  useEffect(() => {
    setLoading(true);
    fetchIssues({ ...filters, page, limit: 12 })
      .then(setResult)
      .catch(() => setResult({ issues: [], pages: 0, total: 0 }))
      .finally(() => setLoading(false));
  }, [filters, page]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Explore civic issues</h1>
        <p className="mt-1 text-sm text-slate-600">
          Search, filter and support issues near you.
          {result && ` · ${result.total} total`}
        </p>
      </header>

      <IssueFilters
        categories={meta.categories}
        departments={meta.departments}
        onChange={setFilters}
      />

      <div className="mt-6">
        {loading ? (
          <Spinner />
        ) : !result?.issues?.length ? (
          <EmptyState
            title="No issues match your filters"
            body="Try clearing filters or report a new issue."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.issues.map((issue) => (
              <IssueCard key={issue.id} issue={issue} distance={issue.distance_metres} />
            ))}
          </div>
        )}
      </div>

      <Pagination page={result?.page || 1} pages={result?.pages || 1} onChange={setPage} />
    </div>
  );
}