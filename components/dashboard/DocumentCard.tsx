"use client";

type Props = {
  title: string;
  comments: number;
  color: "purple" | "green" | "pink" | "blue" | "yellow";
  href?: string;
};

const colorMap = {
  purple: "from-purple-500 to-indigo-500",
  green: "from-green-400 to-teal-500",
  pink: "from-pink-400 to-rose-500",
  blue: "from-blue-400 to-indigo-500",
  yellow: "from-yellow-400 to-orange-400",
};

export default function DocumentCard({ title, comments, color, href }: Props) {
  return (
    <div className="rounded-2xl shadow-md bg-white overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
      
      <div className={`h-32 bg-gradient-to-r ${colorMap[color]} relative`}>
        <div className="absolute bottom-[-30px] left-6 bg-white p-3 rounded-xl shadow-md">
          📄💬
        </div>
      </div>

      <div className="pt-10 p-5">
        <h3 className="font-semibold text-gray-800 text-sm truncate w-full">
          {href ? (
            <a
              href={href}
              className="hover:text-blue-600"
              onClick={(e) => e.stopPropagation()} // stops any parent click
            >
              {title}
            </a>
          ) : (
            title
          )}
        </h3>

        <p className="text-gray-500 text-sm mt-2">
          View comments for this document
        </p>

        <div className="flex items-center justify-between mt-4">
          <span className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-600">
            Top-level Comments
          </span>

          <span className="w-8 h-8 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-600 font-semibold">
            {comments}
          </span>
        </div>
      </div>
    </div>
  );
}