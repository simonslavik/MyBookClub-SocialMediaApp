import { lazy, Suspense } from 'react';

const AddCurrentBookModal = lazy(() => import('@components/features/bookclub/Modals/AddCurrentBookModal'));
const CurrentBookDetailsModal = lazy(() => import('@components/features/bookclub/Modals/CurrentBookDetailsModal'));
const AddBookToBookclubModal = lazy(() => import('@components/features/bookclub/Modals/AddBookToBookclubModal'));
const CreateRoomModal = lazy(() => import('@components/features/bookclub/Modals/CreateRoomModal'));
const RoomSettingsModal = lazy(() => import('@components/features/bookclub/Modals/RoomSettingsModal'));
const ScheduleMeetingModal = lazy(() => import('@components/features/bookclub/Modals/ScheduleMeetingModal'));
const InviteModal = lazy(() => import('@components/common/modals/InviteModal'));

/**
 * Lazy-loaded modal cluster for the bookclub page.
 * Each modal mounts only when its open flag flips, keeping the initial bundle small.
 */
const BookclubModals = ({
  modals,
  bookClubId, bookClub, bookClubMembers, mappedBookClubMembers,
  auth, userRole,
  currentBookData, setCurrentBookData,
  roomSettingsTarget, setRoomSettingsTarget,
  showScheduleMeetingModal, closeScheduleMeetingModal, meetingToEdit,
  fetchBookclubBooks, notifySectionActivity,
  handleCreateRoomSubmit, switchRoom,
  handleRoomUpdated, handleRoomDeleted,
}) => (
  <Suspense fallback={null}>
    {modals.isOpen('addCurrentBook') && (
      <AddCurrentBookModal
        bookClubId={bookClubId}
        onClose={() => modals.close('addCurrentBook')}
        onBookAdded={() => modals.close('addCurrentBook')}
      />
    )}

    {currentBookData && (
      <CurrentBookDetailsModal
        bookClubId={bookClubId} currentBookData={currentBookData}
        members={bookClubMembers}
        onClose={() => setCurrentBookData(null)}
        onBookUpdated={setCurrentBookData}
        onBookRemoved={() => setCurrentBookData(null)}
      />
    )}

    {modals.isOpen('addBook') && (
      <AddBookToBookclubModal
        bookClubId={bookClubId}
        onClose={() => modals.close('addBook')}
        onBookAdded={() => {
          modals.close('addBook');
          fetchBookclubBooks();
          notifySectionActivity('books');
        }}
      />
    )}

    {modals.isOpen('invite') && (
      <InviteModal
        bookClubId={bookClubId} bookClubName={bookClub?.name}
        bookClubMembers={mappedBookClubMembers} currentUserRole={userRole}
        onClose={() => modals.close('invite')}
      />
    )}

    <CreateRoomModal
      isOpen={modals.isOpen('createRoom')}
      onClose={() => modals.close('createRoom')}
      onCreateRoom={async (roomData) => {
        const room = await handleCreateRoomSubmit(roomData);
        switchRoom(room);
      }}
      members={bookClubMembers} currentUserId={auth?.user?.id}
    />

    <RoomSettingsModal
      isOpen={!!roomSettingsTarget} onClose={() => setRoomSettingsTarget(null)}
      room={roomSettingsTarget} bookClubId={bookClubId}
      allMembers={bookClubMembers} currentUserId={auth?.user?.id}
      userRole={userRole}
      onRoomUpdated={handleRoomUpdated} onRoomDeleted={handleRoomDeleted}
    />

    <ScheduleMeetingModal
      isOpen={showScheduleMeetingModal}
      onClose={closeScheduleMeetingModal}
      bookClubId={bookClubId} meeting={meetingToEdit}
      onMeetingSaved={() => {
        if (window.__meetingsRefresh) window.__meetingsRefresh();
        notifySectionActivity('meetings');
      }}
    />
  </Suspense>
);

export default BookclubModals;
