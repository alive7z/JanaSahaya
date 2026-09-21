import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import IssueFilters from '../components/issues/IssueFilters';
import IssueCard from '../components/issues/IssueCard';
import { Pagination } from '../components/common/Pagination';
import { EmptyState, Spinner } from '../components/common/Button';
import { fetchIssues, fetchMyIssues } from '../services/issues';
import { fetchMeta } from '../services/meta';
import { useAuth } from '../context/AuthContext';

export default function Issues() {
  const [params, setParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const tab = params.get('tab') || 'all';
  const personalTab = ['my', 'voted', 'following'].includes(tab) && isAuthenticated;
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
    const request = personalTab
      ? fetchMyIssues(tab === 'my' ? 'reported' : tab, page)
      : fetchIssues({ ...filters, page, limit: 12 });
    request
      .then(setResult)
      .catch(() => setResult({ issues: [], pages: 0, total: 0 }))
      .finally(() => setLoading(false));
  }, [filters, page, personalTab, tab]);

  const headings = {
    my: ['My reports', 'Issues you have reported and their latest progress.'],
    voted: ['Supported issues', 'Issues you have supported in your community.'],
    following: ['Following', 'Issues you are following for updates.'],
    all: ['Explore civic issues', 'Search, filter and support issues near you.'],
  };
  const [heading, subheading] = headings[personalTab ? tab : 'all'];

  return (
    <div className="page-shell py-8">
      <header className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">{heading}</h1>
          <p className="mt-1 text-sm text-slate-600">
          {subheading}{result && ` · ${result.total} total`}
          </p>
      </header>

      {isAuthenticated && (
        <div className="mb-5 flex flex-wrap gap-2">
          {[
            ['all', 'All issues'], ['my', 'My reports'], ['voted', 'Supported'], ['following', 'Following'],
          ].map(([value, label]) => (
            <button key={value} type="button" onClick={() => { setPage(1); setParams(value === 'all' ? {} : { tab: value }); }} className={tab === value || (value === 'all' && !personalTab) ? 'btn-primary' : 'btn-secondary'}>{label}</button>
          ))}
        </div>
      )}

      {!personalTab && <IssueFilters categories={meta.categories} departments={meta.departments} onChange={setFilters} />}

      <div className="mt-6">
        {loading ? (
          <Spinner />
        ) : !result?.issues?.length ? (
          <EmptyState
            illustration={tab === 'my' ? 'reports-empty' : 'no-results'}
            title={tab === 'my' ? 'No reports yet' : 'No issues found'}
            body={tab === 'my' ? 'Report your first civic issue and track its progress here.' : 'Try another view or report a new issue.'}
            action={<Link to="/report" className="btn-primary">Report an Issue</Link>}
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
