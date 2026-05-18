import { useContext, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiImage, FiX, FiUnlock, FiLock, FiEyeOff, FiArrowLeft, FiCheck } from 'react-icons/fi';
import { bookclubAPI } from '@api/bookclub.api';
import AuthContext from '@context/index';
import logger from '@utils/logger';
import { BOOKCLUB_CATEGORIES } from '@config/constants';

const NAME_MAX = 60;
const DESC_MAX = 280;

type Visibility = 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY';

const VISIBILITY_OPTIONS: Array<{
  key: Visibility; label: string; description: string; Icon: typeof FiUnlock;
}> = [
  { key: 'PUBLIC',      label: 'Public',      description: 'Anyone can find and join instantly',     Icon: FiUnlock },
  { key: 'PRIVATE',     label: 'Private',     description: 'Visible to everyone, joining is gated',  Icon: FiLock },
  { key: 'INVITE_ONLY', label: 'Invite only', description: 'Hidden from search, members invite-only', Icon: FiEyeOff },
];

const NewBookClubPage = () => {
  const { auth } = useContext(AuthContext);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'General',
    visibility: 'PUBLIC' as Visibility,
    requiresApproval: false,
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!auth?.token) { setError('Please log in to create a book club'); return; }
    if (!form.name.trim()) { setError('Book club name is required'); return; }

    setLoading(true);
    setError('');
    try {
      const response = await bookclubAPI.createBookclub({
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category,
        visibility: form.visibility,
        requiresApproval: form.visibility === 'PRIVATE' ? form.requiresApproval : false,
      });
      const bookClubId = response.success ? response.data.id : response.data?.data?.id || response.data.id;
      logger.debug('Created Bookclub:', bookClubId);

      if (selectedImage) {
        try {
          const formData = new FormData();
          formData.append('image', selectedImage);
          await bookclubAPI.uploadImage(bookClubId, formData);
        } catch (imgErr) {
          logger.error('Image upload failed:', imgErr);
          navigate(`/bookclub/${bookClubId}`);
          return;
        }
      }
      navigate(`/bookclub/${bookClubId}`);
    } catch (err: any) {
      logger.error('Error creating book club:', err);
      setError(err.response?.data?.error || 'Failed to create book club. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [auth?.token, form, selectedImage, navigate]);

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-gray-950">
      {/* Top bar — back link + page title, sits above the form card */}
      <div className="px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
          >
            <FiArrowLeft size={16} />
            Back
          </button>
          <h1 className="mt-4 text-2xl sm:text-3xl font-semibold text-stone-900 dark:text-stone-100">Create a book club</h1>
          <p className="mt-1.5 text-sm text-stone-500 dark:text-stone-400">Spin up a new reading community. You can always change these details later.</p>
        </div>
      </div>

      {/* Card */}
      <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="max-w-4xl mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-sm ring-1 ring-black/5 dark:ring-white/10 overflow-hidden">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-0">

              {/* ───── LEFT COLUMN: cover image ───── */}
              <div className="p-6 lg:p-8 border-b lg:border-b-0 lg:border-r border-stone-100 dark:border-gray-800">
                <p className="text-xs uppercase tracking-wider font-semibold text-stone-500 dark:text-stone-400 mb-3">Cover</p>
                {imagePreview ? (
                  <div className="relative group">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full aspect-square object-cover rounded-xl ring-1 ring-black/5 dark:ring-white/10"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-lg backdrop-blur-sm transition-colors"
                      aria-label="Remove cover image"
                    >
                      <FiX size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-x-2 bottom-2 px-3 py-2 bg-white/85 hover:bg-white text-stone-900 text-xs font-medium rounded-lg backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Change image
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full aspect-square rounded-xl border-2 border-dashed border-stone-200 dark:border-gray-700 flex flex-col items-center justify-center text-stone-400 hover:text-stone-700 hover:border-stone-400 dark:hover:border-stone-500 dark:hover:text-stone-200 hover:bg-stone-50 dark:hover:bg-gray-800/40 transition-colors"
                  >
                    <FiImage size={28} className="mb-2" />
                    <span className="text-sm font-medium">Add cover</span>
                    <span className="text-[11px] text-stone-400 mt-0.5">PNG · JPG · 5MB max</span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </div>

              {/* ───── RIGHT COLUMN: form fields ───── */}
              <div className="p-6 lg:p-8 space-y-5">
                {error && (
                  <div role="alert" className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-sm">
                    {error}
                  </div>
                )}

                {/* Name */}
                <div>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <label htmlFor="name" className="text-xs uppercase tracking-wider font-semibold text-stone-500 dark:text-stone-400">Name</label>
                    <span className="text-[11px] text-stone-400 dark:text-stone-500 tabular-nums">{form.name.length}/{NAME_MAX}</span>
                  </div>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="e.g. The Sci-Fi Club"
                    maxLength={NAME_MAX}
                    autoFocus
                    required
                    className="w-full px-4 py-3 rounded-xl bg-stone-100 dark:bg-gray-800 text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-gray-600 transition"
                  />
                </div>

                {/* Description */}
                <div>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <label htmlFor="description" className="text-xs uppercase tracking-wider font-semibold text-stone-500 dark:text-stone-400">Description</label>
                    <span className="text-[11px] text-stone-400 dark:text-stone-500 tabular-nums">{form.description.length}/{DESC_MAX}</span>
                  </div>
                  <textarea
                    id="description"
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    placeholder="What's this club about? What do you read together?"
                    rows={3}
                    maxLength={DESC_MAX}
                    className="w-full px-4 py-3 rounded-xl bg-stone-100 dark:bg-gray-800 text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-gray-600 transition resize-none"
                  />
                </div>

                {/* Category */}
                <div>
                  <label htmlFor="category" className="block text-xs uppercase tracking-wider font-semibold text-stone-500 dark:text-stone-400 mb-1.5">Category</label>
                  <select
                    id="category"
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl bg-stone-100 dark:bg-gray-800 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-gray-600 transition appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_1rem_center] pr-10"
                  >
                    {BOOKCLUB_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Visibility — segmented radio cards with monochrome active state */}
                <div>
                  <p className="text-xs uppercase tracking-wider font-semibold text-stone-500 dark:text-stone-400 mb-2">Visibility</p>
                  <div className="space-y-2">
                    {VISIBILITY_OPTIONS.map(({ key, label, description, Icon }) => {
                      const active = form.visibility === key;
                      return (
                        <label
                          key={key}
                          className={`relative flex items-start gap-3 p-3.5 rounded-xl cursor-pointer transition-all ${
                            active
                              ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 ring-2 ring-stone-900 dark:ring-stone-100'
                              : 'bg-stone-50 dark:bg-gray-800/60 ring-1 ring-stone-200 dark:ring-gray-800 hover:ring-stone-300 dark:hover:ring-gray-700 text-stone-700 dark:text-stone-200'
                          }`}
                        >
                          <input
                            type="radio"
                            name="visibility"
                            value={key}
                            checked={active}
                            onChange={handleChange}
                            className="sr-only"
                          />
                          <div className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center ring-1 ${
                            active
                              ? 'bg-white dark:bg-stone-900 ring-transparent'
                              : 'bg-white dark:bg-gray-900 ring-stone-300 dark:ring-gray-700'
                          }`}>
                            {active && <FiCheck size={12} className="text-stone-900 dark:text-stone-100" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Icon size={14} className={active ? '' : 'opacity-60'} />
                              <span className="text-sm font-semibold">{label}</span>
                            </div>
                            <p className={`text-xs mt-0.5 ${active ? 'opacity-80' : 'opacity-70'}`}>
                              {description}
                            </p>

                            {/* Inline approval toggle — only shown when Private is selected */}
                            {key === 'PRIVATE' && active && (
                              <label
                                className="mt-3 flex items-center gap-2 text-xs cursor-pointer"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="checkbox"
                                  name="requiresApproval"
                                  checked={form.requiresApproval}
                                  onChange={handleChange}
                                  className="w-3.5 h-3.5 accent-white dark:accent-stone-900"
                                />
                                <span>Require admin approval for join requests</span>
                              </label>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky-looking footer (single row, bottom of card) */}
            <div className="px-6 lg:px-8 py-4 border-t border-stone-100 dark:border-gray-800 flex justify-end gap-2 bg-stone-50/50 dark:bg-gray-900/60">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-4 py-2.5 text-sm font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !form.name.trim()}
                className="px-5 py-2.5 text-sm font-semibold bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-900 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {loading && <span className="w-4 h-4 border-2 border-current border-r-transparent rounded-full animate-spin" />}
                {loading ? 'Creating…' : 'Create book club'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default NewBookClubPage;
