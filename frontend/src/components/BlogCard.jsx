import React, { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function BlogCard({ blog: initialBlog }) {
  const [blog, setBlog] = useState(initialBlog);

  const handleRate = async (e, type) => {
    e.preventDefault(); // Don't navigate to detail page when clicking buttons
    try {
      const res = await api.patch(`/blogs/${blog._id}/rate`, { type });
      setBlog(res.data.blog);
    } catch (err) {
      console.error("Failed to rate:", err);
    }
  };

  return (
    <article className="py-12 border-b border-stone-100 animate-fade-in group">
      <Link to={`/blog/${blog._id}`} className="block">
        
        {/* Header: Source / Author */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-5 h-5 bg-stone-900 rounded-sm flex items-center justify-center text-[8px] text-white font-bold">
            M
          </div>
          <p className="text-[11px] font-bold text-stone-900">
            In <span className="underline">Insights</span> <span className="font-normal text-stone-400 mx-1">by</span> The Manuscript
          </p>
        </div>

        {/* Body: Title & Teaser */}
        <div className="space-y-3 mb-6">
          <h2 className="text-2xl md:text-3xl font-black text-stone-900 leading-tight group-hover:text-stone-600 transition-colors">
            {blog.title}
          </h2>
          <p className="text-stone-500 text-base md:text-lg leading-snug line-clamp-2 serif">
            {blog.summary}
          </p>
        </div>

        {/* Footer: Metadata & Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-stone-400">
            <span className="flex items-center gap-1.5">
              <span className="text-yellow-500">✦</span>
              {formatDate(blog.createdAt)}
            </span>
            <span className="bg-stone-100 px-2 py-0.5 rounded-full text-[10px] font-bold text-stone-500 uppercase">
              {blog.category}
            </span>
            
            {/* Real-time Counts */}
            <div className="flex items-center gap-4 ml-2 border-l border-stone-100 pl-4">
              <button 
                onClick={(e) => handleRate(e, "like")}
                className="flex items-center gap-1 hover:text-stone-900 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10h4.708C19.746 10 20.621 10.875 20.621 11.958c0 .504-.192.983-.542 1.346l-4.708 4.708a2 2 0 01-1.414.586H9a2 2 0 01-2-2v-9a2 2 0 01.586-1.414L11.172 2.586a2 2 0 012.828 0 2 2 0 01.586 1.414V10z"></path></svg>
                {blog.likes || 0}
              </button>
              <button 
                onClick={(e) => handleRate(e, "dislike")}
                className="flex items-center gap-1 hover:text-stone-900 transition-colors"
              >
                <svg className="w-4 h-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10h4.708C19.746 10 20.621 10.875 20.621 11.958c0 .504-.192.983-.542 1.346l-4.708 4.708a2 2 0 01-1.414.586H9a2 2 0 01-2-2v-9a2 2 0 01.586-1.414L11.172 2.586a2 2 0 012.828 0 2 2 0 01.586 1.414V10z"></path></svg>
                {blog.dislikes || 0}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-5 text-stone-400">
            <button className="hover:text-stone-900 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path></svg>
            </button>
          </div>
        </div>
      </Link>
    </article>
  );
}

