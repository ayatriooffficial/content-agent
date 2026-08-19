import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api";
import ReactMarkdown from "react-markdown";

export default function BlogDetail() {
  const { id } = useParams();
  const [blog, setBlog] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBlog() {
      try {
        const res = await api.get(`/blogs`);
        const found = res.data.blogs.find(b => b._id === id);
        setBlog(found);

        // Fetch related blogs (same category)
        if (found) {
          const relRes = await api.get(`/blogs/${found._id}/related`);
          setRelated(relRes.data.related || []);
        }
      } catch (err) {
        console.error("Error fetching blog:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchBlog();
  }, [id]);

  const handleRate = async (type) => {
    try {
      const res = await api.patch(`/blogs/${blog._id}/rate`, { type });
      setBlog(res.data.blog);
    } catch (err) {
      console.error("Failed to rate:", err);
    }
  };

  if (loading) return (
    <div className="max-w-4xl mx-auto py-40 px-6 text-center">
      <p className="text-stone-400 animate-pulse serif text-2xl">Loading the article...</p>
    </div>
  );

  if (!blog) return (
    <div className="max-w-4xl mx-auto py-40 px-6 text-center">
      <h2 className="text-3xl font-bold mb-6">Article not found.</h2>
      <Link to="/blogs" className="text-stone-500 underline">Back to Feed</Link>
    </div>
  );

  // Calculate reading time
  const wordCount = blog.wordCount || blog.content?.split(" ").length || 0;
  const readingTime = blog.readingTime || Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div className="bg-white min-h-screen">
      <nav className="border-b border-stone-100 py-6 px-8 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <Link to="/" className="text-xl font-black tracking-tighter text-stone-900 serif">The Manuscript<span className="text-emerald-500">.</span></Link>
        <Link to="/blogs" className="text-xs font-bold uppercase tracking-widest text-stone-500 hover:text-stone-900 transition-all">Back to Library</Link>
      </nav>

      <article className="animate-fade-in">
        {/* ── Premium Hero Section ── */}
        <header className="max-w-5xl mx-auto pt-24 pb-16 px-8 border-b border-stone-100">
          <div className="flex items-center gap-3 mb-8">
            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest rounded-full">{blog.category}</span>
            <span className="text-stone-300">/</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">{readingTime} min read</span>
            <span className="text-stone-300">/</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">{new Date(blog.createdAt).toLocaleDateString()}</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-stone-900 leading-[1.2] serif tracking-tight mb-12 max-w-4xl text-left">
            {blog.title}
          </h1>

          <p className="text-xl text-stone-500 serif leading-relaxed max-w-3xl italic text-left">
            {blog.summary}
          </p>

          <div className="mt-12 flex items-center gap-4">
            <div className="w-10 h-10 bg-stone-900 rounded-full flex items-center justify-center text-white font-bold text-xs font-serif italic">M</div>
            <div>
              <p className="text-xs font-bold text-stone-900 uppercase tracking-widest">Editorial Staff</p>
              <p className="text-[10px] text-stone-400 uppercase font-medium">The Manuscript Journal</p>
            </div>
          </div>
        </header>

        {/* ── Main Content Grid ── */}
        <div className="max-w-5xl mx-auto px-8 py-20 grid lg:grid-cols-12 gap-20">
          
          {/* Left: Content Area */}
          <div className="lg:col-span-8">
            <div className="prose prose-stone max-w-none text-left">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => <h1 className="hidden">{children}</h1>, // Already in hero
                  h2: ({ children }) => <h2 className="text-3xl md:text-4xl font-bold text-stone-900 mt-16 mb-8 serif border-l-4 border-emerald-500 pl-6 text-left">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-2xl font-bold text-stone-800 mt-12 mb-6 serif text-left">{children}</h3>,
                  p: ({ children }) => <p className="text-xl text-stone-700 leading-[1.9] mb-10 serif text-left">{children}</p>,
                  ul: ({ children }) => <ul className="list-none space-y-6 mb-10 pl-0 text-left">{children}</ul>,
                  li: ({ children }) => (
                    <li className="flex items-start gap-4 text-xl text-stone-700 serif text-left">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full mt-3 flex-shrink-0" />
                      <span>{children}</span>
                    </li>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="my-16 py-8 border-t border-b border-stone-200 text-3xl text-stone-900 serif italic leading-relaxed text-center px-12">
                      "{children}"
                    </blockquote>
                  ),
                  strong: ({ children }) => <strong className="font-bold text-stone-900">{children}</strong>,
                }}
              >
                {blog.content}
              </ReactMarkdown>
            </div>

            {/* FAQ Section Integrated */}
            {blog.faq && blog.faq.length > 0 && (
              <section className="mt-32 pt-20 border-t border-stone-100">
                <h3 className="text-xs font-black uppercase tracking-[0.4em] text-emerald-600 mb-12">Intelligence Supplement / FAQ</h3>
                <div className="space-y-8">
                  {blog.faq.map((item, i) => (
                    <div key={i} className="group cursor-pointer">
                      <p className="font-bold text-stone-900 mb-3 text-lg group-hover:text-emerald-600 transition-colors text-left">{item.question}</p>
                      <p className="text-stone-500 serif text-base leading-relaxed text-left">{item.answer}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right: Sidebar Meta Intelligence */}
          <aside className="lg:col-span-4 space-y-12">
            <div className="sticky top-32">
              <div className="bg-stone-50 rounded-3xl p-8 border border-stone-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-6">Article Context</p>
                <div className="space-y-6">
                  {blog.metaDescription && (
                    <div>
                      <p className="text-[10px] font-bold text-stone-400 uppercase mb-1">Overview</p>
                      <p className="text-sm text-stone-600 serif leading-relaxed">{blog.metaDescription}</p>
                    </div>
                  )}
                  {blog.tags && (
                    <div className="flex flex-wrap gap-2 pt-4">
                      {blog.tags.map((t, i) => <span key={i} className="text-[9px] font-bold bg-white border border-stone-200 px-2 py-1 rounded uppercase tracking-wider text-stone-500">#{t}</span>)}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8 p-8 flex justify-center gap-12 border-t border-stone-100">
                <button onClick={() => handleRate("like")} className="text-center group">
                  <div className="text-2xl mb-1 group-hover:scale-125 transition-transform">💎</div>
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{blog.likes || 0}</p>
                </button>
                <button onClick={() => handleRate("dislike")} className="text-center group">
                  <div className="text-2xl mb-1 group-hover:scale-125 transition-transform rotate-180">💎</div>
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{blog.dislikes || 0}</p>
                </button>
              </div>
            </div>
          </aside>
        </div>
      </article>

      {/* ── Premium Global Footer ── */}
      <footer className="bg-stone-950 text-white pt-32 pb-20 px-8 mt-20">
        <div className="max-w-6xl mx-auto grid md:grid-cols-12 gap-20">
          <div className="md:col-span-5">
            <h2 className="text-4xl font-bold mb-8 serif">The Manuscript<span className="text-emerald-500">.</span></h2>
            <p className="text-stone-400 serif text-lg leading-relaxed mb-8">
              A high-fidelity editorial collective dedicated to exploring the nuances of the professional landscape. We synthesize complex data into clear, narrative-driven insights that resonate with the modern achiever.
            </p>
            <div className="flex gap-4">
              {['Twitter', 'LinkedIn', 'Instagram'].map(s => (
                <a key={s} href="#" className="text-xs font-bold uppercase tracking-widest text-stone-500 hover:text-white transition-colors">{s}</a>
              ))}
            </div>
          </div>
          
          <div className="md:col-span-3">
            <h4 className="text-xs font-black uppercase tracking-[0.3em] text-emerald-500 mb-8">Navigation</h4>
            <ul className="space-y-4 text-stone-400 font-medium text-sm">
              <li><Link to="/" className="hover:text-white transition-colors">Home Studio</Link></li>
              <li><Link to="/blogs" className="hover:text-white transition-colors">The Library</Link></li>
              <li><a href="#" className="hover:text-white transition-colors">Architecture</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
            </ul>
          </div>

          <div className="md:col-span-4">
            <h4 className="text-xs font-black uppercase tracking-[0.3em] text-emerald-500 mb-8">Newsletter</h4>
            <p className="text-stone-400 text-sm mb-6 serif">Get the latest AI marketing intelligence delivered to your inbox.</p>
            <div className="flex gap-2">
              <input type="email" placeholder="Email address" className="bg-stone-900 border border-stone-800 rounded-xl px-4 py-3 text-sm flex-1 focus:outline-none focus:border-purple-500" />
              <button className="bg-emerald-600 hover:bg-emerald-500 px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all">Join</button>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-32 pt-8 border-t border-stone-900 flex justify-between items-center text-[10px] font-bold uppercase tracking-[0.3em] text-stone-600">
          <p>© {new Date().getFullYear()} The Manuscript. All rights reserved.</p>
          <p>Hand-crafted Excellence</p>
        </div>
      </footer>

      {/* ── Related Blogs Section ── */}
      {related.length > 0 && (
        <section className="max-w-6xl mx-auto mt-24 pt-16 pb-32 px-8 border-t border-stone-100">
          <h3 className="text-xs font-black uppercase tracking-[0.3em] text-stone-400 mb-10">
            More from {blog.category}
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            {related.map((r) => (
              <Link
                key={r._id}
                to={`/blog/${r._id}`}
                className="group block p-6 rounded-2xl hover:bg-stone-50 transition-all border border-stone-100 hover:border-stone-200"
              >
                <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-3 block">
                  {r.category}
                </span>
                <h4 className="font-bold text-stone-900 leading-snug group-hover:underline serif text-lg mb-2 line-clamp-2">
                  {r.title}
                </h4>
                <p className="text-xs text-stone-400 line-clamp-2 serif">
                  {r.summary}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
