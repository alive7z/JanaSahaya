import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Camera, ImagePlus, X } from 'lucide-react';
import LocationPicker from '../components/maps/LocationPicker';
import DuplicateWarning from '../components/issues/DuplicateWarning';
import { Button, Spinner } from '../components/common/Button';
import { useToast } from '../components/common/Toast';
import { useAuth } from '../context/AuthContext';
import { fetchMeta } from '../services/meta';
import { createIssue, checkDuplicates } from '../services/issues';
import { getUserLocation, reverseGeocode } from '../utils/geo';
import { DEFAULT_COORDS } from '../constants';

export default function ReportIssue() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { register: field, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm();

  const [meta, setMeta] = useState({ categories: [], departments: [] });
  const [loc, setLoc] = useState(null);
  const [images, setImages] = useState([]);
  const [duplicates, setDuplicates] = useState([]);
  const [checking, setChecking] = useState(false);

  const titleValue = watch('title');
  const categoryIdValue = watch('categoryId');

  const defaultLoc = { latitude: DEFAULT_COORDS.dehradun[0], longitude: DEFAULT_COORDS.dehradun[1] };

  useEffect(() => {
    fetchMeta().then((m) => setMeta(m)).catch(() => {});
    getUserLocation().then((p) => {
      if (p?.ok) {
        const next = { ...loc, latitude: p.latitude, longitude: p.longitude };
        setLoc({ ...next });
        reverseGeocode(p.latitude, p.longitude).then((g) => {
          setLoc((prev) => ({ ...prev, address: g.address, city: g.city }));
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const effectiveLoc = loc || defaultLoc;

  const selectedCategory = useMemo(
    () => meta.categories.find((c) => String(c.id) === String(categoryIdValue)),
    [meta.categories, categoryIdValue],
  );

  const runDuplicateCheck = useMemo(
    () => async () => {
      if (!titleValue || !categoryIdValue || !loc) return;
      setChecking(true);
      try {
        const res = await checkDuplicates({
          title: titleValue,
          description: 'provisional',
          categoryId: Number(categoryIdValue),
          latitude: loc.latitude,
          longitude: loc.longitude,
        });
        setDuplicates(res.candidates.filter((c) => c.isLikelyDuplicate));
      } catch {
        setDuplicates([]);
      } finally {
        setChecking(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [titleValue, categoryIdValue, loc],
  );

  useEffect(() => {
    const t = setTimeout(runDuplicateCheck, 600);
    return () => clearTimeout(t);
  }, [runDuplicateCheck]);

  const onSubmit = async (values) => {
    if (!loc) {
      toast.error('Please select a location on the map', 'Location required');
      return;
    }
    try {
      const payload = {
        title: values.title,
        description: values.description,
        categoryId: Number(values.categoryId),
        latitude: loc.latitude,
        longitude: loc.longitude,
        address: loc.address || '',
        city: loc.city || values.city || user?.city || '',
        ward: values.ward || '',
        images,
      };
      const result = await createIssue(payload);
      toast.success('Issue submitted!');
      navigate(`/issue/${result.issueId}`);
    } catch (err) {
      toast.error(err, 'Could not submit the issue');
    }
  };

  const addImages = (files) => {
    const list = Array.from(files).slice(0, 5 - images.length);
    setImages((old) => [...old, ...list]);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Report a civic issue</h1>
        <p className="mt-1 text-sm text-slate-600">
          Be precise about the location and add photos — it helps authorities and keeps duplicates down.
        </p>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-5">
          <div>
            <label className="label" htmlFor="title">Title</label>
            <input
              id="title"
              className="input"
              placeholder="e.g. Large pothole near university gate"
              {...field('title', { required: 'Title is required', minLength: { value: 5, message: 'At least 5 characters' } })}
            />
            {errors.title && <p className="mt-1 text-xs text-rose-600">{errors.title.message}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="categoryId">Category</label>
              <select
                id="categoryId"
                className="input"
                {...field('categoryId', { required: 'Choose a category' })}
              >
                <option value="">Select…</option>
                {meta.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (severity {c.severity}/5)
                  </option>
                ))}
              </select>
              {errors.categoryId && <p className="mt-1 text-xs text-rose-600">{errors.categoryId.message}</p>}
            </div>
            <div>
              <label className="label" htmlFor="ward">Ward / Area</label>
              <input id="ward" className="input" placeholder="Raipur" {...field('ward')} />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="description">Description</label>
            <textarea
              id="description"
              className="input min-h-[120px]"
              placeholder="Describe the problem — size, severity, safety risk, how long it has been there…"
              {...field('description', { required: 'Description is required', minLength: { value: 10, message: 'At least 10 characters' } })}
            />
            {errors.description && <p className="mt-1 text-xs text-rose-600">{errors.description.message}</p>}
          </div>

          <div>
            <span className="label">Evidence photos ({images.length}/5)</span>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white p-6 text-slate-500 hover:border-brand-400 hover:text-brand-600">
              <ImagePlus className="h-5 w-5" />
              Add photos (JPEG / PNG / WebP)
              <input
                type="file"
                hidden
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(e) => addImages(e.target.files)}
              />
            </label>
            {images.length > 0 && (
              <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                {images.map((img, i) => (
                  <li key={`${img.name}-${i}`} className="relative overflow-hidden rounded-lg ring-1 ring-slate-200">
                    <img src={URL.createObjectURL(img)} alt={img.name} className="h-20 w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setImages((old) => old.filter((_, j) => j !== i))}
                      className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white"
                      aria-label="Remove image"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">
              Pin the exact location
              <span className="ml-1 text-xs font-normal text-slate-400">
                {loc ? ` · ${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)}` : ' · needs location'}
              </span>
            </label>
            <LocationPicker
              lat={effectiveLoc.latitude}
              lng={effectiveLoc.longitude}
              onChange={(p) => setLoc((prev) => ({ ...(prev || {}), ...p }))}
            />
            {loc?.city && <p className="mt-1 text-xs text-slate-500">Detected: {loc.city}</p>}
          </div>

          {selectedCategory && (
            <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
              Routed to <span className="font-medium text-slate-800">{selectedCategory.department_name || 'the backlog'}</span> for
              category “{selectedCategory.name}” (severity {selectedCategory.severity}/5).
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting || checking}>
            {isSubmitting ? <Spinner label="" className="py-0" /> : (
              <>
                <Camera className="h-4 w-4" /> Submit issue
              </>
            )}
          </Button>
        </div>
      </form>

      {duplicates.length > 0 && <DuplicateWarning duplicates={duplicates} />}
      {toast.node}
    </div>
  );
}