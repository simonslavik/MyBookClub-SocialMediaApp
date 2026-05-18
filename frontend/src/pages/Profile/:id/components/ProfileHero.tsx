import { useEffect, useRef, useState } from 'react';
import { FiEdit2, FiMessageCircle, FiUserPlus, FiUserCheck, FiClock, FiBook, FiUsers, FiCalendar, FiX, FiChevronDown } from 'react-icons/fi';
import { getProfileImageUrl } from '@config/constants';
import { getAvatarUrl, getAvatarSeed } from '@utils/avatar';
import { useConfirm } from '@hooks/useUIFeedback';

export default function ProfileHero({
    profile, isOwnProfile,
    imagePreview, uploadingImage, fileInputRef, onImageSelect,
    friendRequestLoading, onSendFriendRequest, onCancelFriendRequest, onMessage,
    clubCount, navigate,
}) {
    const joinDate = new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return (
        <section className="bg-stone-800 dark:bg-gray-950 relative overflow-hidden">
            {/* Decorative grain */}
            <div className="absolute inset-0 opacity-[0.03] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1IiBoZWlnaHQ9IjUiPgo8cmVjdCB3aWR0aD0iNSIgaGVpZ2h0PSI1IiBmaWxsPSIjZmZmIj48L3JlY3Q+CjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiMwMDAiPjwvcmVjdD4KPC9zdmc+')] pointer-events-none" />

            <div className="max-w-5xl mx-auto px-5 md:px-8 pt-10 pb-12 md:pt-14 md:pb-16 relative z-10">
                <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                        <div className="w-32 h-32 md:w-36 md:h-36 rounded-2xl overflow-hidden ring-4 ring-white/10 bg-stone-700">
                            <img
                                src={imagePreview || getProfileImageUrl(profile.profileImage) || getAvatarUrl(getAvatarSeed(profile))}
                                alt={profile.name}
                                className={`w-full h-full object-cover ${isOwnProfile ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                                onClick={() => isOwnProfile && fileInputRef.current?.click()}
                                onError={(e) => { (e.target as HTMLImageElement).src = getAvatarUrl(getAvatarSeed(profile)); }}
                            />
                        </div>
                        {uploadingImage && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl">
                                <div className="text-white text-sm font-medium font-outfit">Uploading…</div>
                            </div>
                        )}
                        {isOwnProfile && (
                            <>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute -bottom-1 -right-1 w-8 h-8 bg-white text-stone-700 rounded-lg flex items-center justify-center shadow-md hover:bg-stone-50 transition-colors"
                                >
                                    <FiEdit2 size={14} />
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={onImageSelect}
                                    className="hidden"
                                />
                            </>
                        )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 text-center md:text-left">
                        <h1 className="text-3xl md:text-4xl font-display font-bold text-white leading-tight tracking-tight">
                            {profile.name}
                        </h1>
                        {profile.bio && (
                            <p className="mt-2 text-stone-300 font-outfit text-sm md:text-base max-w-xl leading-relaxed line-clamp-2">
                                {profile.bio}
                            </p>
                        )}
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-4 text-stone-400 text-sm font-outfit">
                            <span className="flex items-center gap-1.5"><FiBook size={15} /> {clubCount} clubs</span>
                            <span className="flex items-center gap-1.5"><FiUsers size={15} /> {profile.numberOfFriends || 0} friends</span>
                            <span className="flex items-center gap-1.5"><FiCalendar size={15} /> Joined {joinDate}</span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                        {isOwnProfile ? (
                            <button
                                onClick={() => navigate('/change-profile')}
                                className="px-6 py-2.5 bg-white text-stone-800 rounded-xl text-sm font-semibold hover:bg-stone-100 transition-colors flex items-center gap-2"
                            >
                                <FiEdit2 size={15} />
                                Edit Profile
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={onMessage}
                                    className="px-5 py-2.5 bg-white text-stone-800 rounded-xl text-sm font-semibold hover:bg-stone-100 transition-colors flex items-center gap-2"
                                >
                                    <FiMessageCircle size={15} />
                                    Message
                                </button>
                                <FriendButton
                                    status={profile.friendshipStatus}
                                    loading={friendRequestLoading}
                                    profileName={profile.name}
                                    onAdd={onSendFriendRequest}
                                    onCancel={onCancelFriendRequest}
                                    onRespond={() => navigate('/')}
                                />
                            </>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}

/* ── Friend status button ─────────────────────────── */
function FriendButton({ status, loading, profileName, onAdd, onCancel, onRespond }) {
    if (status === 'friends') {
        return (
            <span className="px-5 py-2.5 bg-white/10 text-green-400 rounded-xl text-sm font-semibold flex items-center gap-2 backdrop-blur-sm">
                <FiUserCheck size={15} /> Friends
            </span>
        );
    }
    if (status === 'request_sent') {
        return <PendingDropdown loading={loading} profileName={profileName} onCancel={onCancel} />;
    }
    if (status === 'request_received') {
        return (
            <button onClick={onRespond} className="px-5 py-2.5 bg-white/20 text-white rounded-xl text-sm font-semibold hover:bg-white/30 transition-colors flex items-center gap-2 backdrop-blur-sm">
                Respond
            </button>
        );
    }
    return (
        <button
            onClick={onAdd}
            disabled={loading}
            className="px-5 py-2.5 bg-white/10 text-white rounded-xl text-sm font-semibold hover:bg-white/20 transition-colors flex items-center gap-2 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
            <FiUserPlus size={15} />
            {loading ? 'Sending…' : 'Add Friend'}
        </button>
    );
}

/**
 * Pending-state dropdown. Click the Pending chip → small menu opens
 * with "Cancel request" (and room to add more actions later, e.g.
 * "Send message" or "Block"). Confirms via `useConfirm` so destructive
 * action isn't fired on accidental click.
 */
function PendingDropdown({ loading, profileName, onCancel }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const { confirm } = useConfirm();

    // Close on outside click + Escape
    useEffect(() => {
        if (!open) return;
        const onClick = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', onClick);
        window.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onClick);
            window.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const handleCancel = async () => {
        setOpen(false);
        const ok = await confirm(
            `Cancel friend request to ${profileName || 'this user'}?`,
            { title: 'Cancel request', variant: 'danger', confirmLabel: 'Cancel request' }
        );
        if (ok) onCancel?.();
    };

    return (
        <div className="relative" ref={ref}>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                disabled={loading}
                className="px-5 py-2.5 bg-white/10 hover:bg-white/15 text-stone-200 rounded-xl text-sm font-semibold flex items-center gap-2 backdrop-blur-sm transition-colors disabled:opacity-50"
                aria-haspopup="menu"
                aria-expanded={open}
            >
                <FiClock size={15} /> Pending
                <FiChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div
                    role="menu"
                    className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-gray-900 rounded-xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden z-20 animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-150"
                >
                    <button
                        type="button"
                        role="menuitem"
                        onClick={handleCancel}
                        disabled={loading}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50"
                    >
                        <FiX size={14} />
                        {loading ? 'Cancelling…' : 'Cancel request'}
                    </button>
                </div>
            )}
        </div>
    );
}
