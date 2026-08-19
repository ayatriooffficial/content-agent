import React, { useState, useEffect, useMemo } from "react";
import { Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
import api from "./api";
import Dashboard from "./components/Dashboard";
import BlogCard from "./components/BlogCard";
import Home from "./components/Home";
import BlogDetail from "./components/BlogDetail";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  const navigate = useNavigate();
  const [blogs, setBlogs] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  useEffect(() => {
    fetchBlogs();
  }, []);

  // ─── Categories logic ───
  const categories = useMemo(() => {
    const cleanList = blogs.map(b => {
      if (!b.category) return "General";
      return b.category
        .replace(/\*\*|__|\\*|_/g, "")
        .replace(/category:|topic:/gi, "")
        .trim()
        .toUpperCase();
    });
    
    const list = ["All", ...new Set(cleanList)];
    return list.filter(Boolean);
  }, [blogs]);


  async function fetchBlogs() {
    try {
      setFetching(true);
      const res = await api.get("/blogs");
      setBlogs(res.data.blogs);
    } catch (err) {
      console.error("Failed to fetch blogs:", err);
    } finally {
      setFetching(false);
    }
  }


  const filteredBlogs = useMemo(() => {
    let result = blogs;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(b => 
        b.title.toLowerCase().includes(query) ||
        b.content.toLowerCase().includes(query)
      );
    }

    if (selectedCategory !== "All") {
      result = result.filter(b => {
        if (!b.category) return false;
        const cleanBlogCat = b.category.replace(/\*\*|__|\\*|_/g, "").replace(/category:|topic:/gi, "").trim().toUpperCase();
        return cleanBlogCat === selectedCategory.toUpperCase();
      });
    }

    return result;
  }, [blogs, searchQuery, selectedCategory]);

  return (
    <>
      <ScrollToTop />
      <div className="min-h-screen bg-white">
        {/* ── Fixed Navigation ── */}
        <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-2xl border-b border-stone-100 z-50 px-6 lg:px-12 h-20 flex items-center justify-between">
          <Link to="/" className="text-2xl font-black tracking-tighter cursor-pointer serif">
            The Manuscript<span className="text-emerald-500">.</span>
          </Link>
          
          <div className="flex items-center gap-8">
            <Link to="/blogs" className="text-xs font-bold uppercase tracking-widest hover:text-stone-500 transition-colors hidden md:block">
              Archive
            </Link>
            <Link 
              to="/dashboard"
              className="text-xs font-bold uppercase tracking-widest bg-emerald-600 text-white px-8 py-3 rounded-full hover:bg-emerald-700 transition-all active:scale-95 shadow-xl shadow-emerald-200"
            >
              Dashboard
            </Link>
          </div>
        </nav>

        {/* ── Main Content Area ── */}
        <main className="pt-20">
          
          <Routes>
            <Route path="/" element={<Home />} />

            <Route path="/dashboard" element={
              <div className="bg-stone-50 min-h-screen py-8">
                <Dashboard />
              </div>
            } />

            <Route path="/blogs" element={
              <div className="max-w-6xl mx-auto py-24 px-6">
                <header className="mb-12 border-b border-stone-100 pb-12">
                  <div className="flex justify-between items-end mb-10">
                    <div>
                      <h2 className="text-5xl md:text-7xl font-bold serif">Archive</h2>
                      {selectedCategory !== "All" && (
                        <button 
                          onClick={() => setSelectedCategory("All")}
                          className="text-xs font-bold uppercase tracking-widest text-stone-400 hover:text-stone-900 mt-4 flex items-center gap-2 group transition-all"
                        >
                          <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to all stories
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Category Pills */}
                  <div className="flex flex-wrap items-center gap-2 mb-10">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-5 py-2 rounded-full text-[11px] font-bold uppercase tracking-widest transition-all ${
                          selectedCategory === cat 
                          ? "bg-stone-900 text-white shadow-lg scale-105" 
                          : "bg-stone-100 text-stone-500 hover:bg-stone-200"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-4">
                    <input 
                      type="text" 
                      placeholder="Search stories..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-transparent border-b border-stone-200 focus:border-stone-900 text-lg py-2 outline-none w-full max-w-md transition-all serif"
                    />
                  </div>
                </header>


                <div className="space-y-4">
                  {fetching ? (
                    <div className="py-20 text-center serif text-2xl text-stone-300 animate-pulse">
                      Curating the collection...
                    </div>
                  ) : filteredBlogs.length === 0 ? (
                    <div className="py-40 text-center serif text-2xl text-stone-300 italic">
                      Nothing found in the archives.
                    </div>
                  ) : (
                    filteredBlogs.map((blog) => (
                      <BlogCard key={blog._id} blog={blog} />
                    ))
                  )}
                </div>
              </div>
            } />

            <Route path="/blog/:id" element={<BlogDetail />} />
          </Routes>
        </main>

        <footer className="mt-40 py-24 border-t border-stone-100 bg-stone-50 text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-stone-400 font-black mb-4">
            The Manuscript · A Premium Editorial Collective
          </p>
          <div className="flex justify-center gap-8 mb-12">
            <Link to="/" className="text-xs font-bold text-stone-500 hover:text-stone-900">Home</Link>
            <Link to="/blogs" className="text-xs font-bold text-stone-500 hover:text-stone-900">Archive</Link>
            <Link to="/dashboard" className="text-xs font-bold text-stone-500 hover:text-stone-900">Dashboard</Link>
          </div>
          <p className="text-[10px] text-stone-300">© {new Date().getFullYear()} The Manuscript. All Rights Reserved.</p>
        </footer>
      </div>
    </>
  );
}
