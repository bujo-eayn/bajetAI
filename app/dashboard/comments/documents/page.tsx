import DocumentCard from "@/components/dashboard/DocumentCard";

export default function DocumentsPage() {
  const documents = [
    { title: "ASSEMBLY APPROVED BUSIA...", comments: 1, color: "purple" },
    { title: "APPROVED CBROP SEGL TEXL", comments: 1, color: "green" },
    { title: "ADP 2025-2026 COUNTY AS...", comments: 1, color: "pink" },
  ];

  return (
    <div className="p-6">
      <div className="rounded-3xl p-6 mb-8 bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 text-white">
        <h1 className="text-2xl font-bold">Documents with Comments</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {documents.map((doc, index) => (
          <DocumentCard
            key={index}
            title={doc.title}
            comments={doc.comments}
            color={doc.color as any}
          />
        ))}
      </div>
    </div>
  );
}