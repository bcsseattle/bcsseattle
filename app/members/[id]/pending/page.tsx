export default async function PendingMembers() {
  return (
    <div className="p-4 relative">
      <h1 className="text-2xl font-bold mb-4">Membership Status: Pending</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <p>
          Your membership status is pending approval. Once approved, you will be
          able to view BCS community details.
        </p>
      </div>
    </div>
  );
}
