const express = require("express");
const router = express.Router();

// ─── Models ───
const Blog = require("../models/Blog");
const { syncSlotStatus } = require("../agents/contentCalendar/calendarSync");

function normalizeBlog(blogDoc) {
  const blog = blogDoc.toObject ? blogDoc.toObject() : { ...blogDoc };
  return {
    ...blog,
    status: blog.status || "pending",
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACCOUNTING DOMAIN BLOG API
// ═══════════════════════════════════════════════════════════════════════════════

// ─── GET /blogs ──
// Fetches all blogs sorted by latest
router.get("/blogs", async (req, res) => {
  try {
    const query = {};
    if (req.query.status) {
      query.status = req.query.status;
    }

    const blogs = await Blog.find(query).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, blogs: blogs.map(normalizeBlog) });
  } catch (error) {
    return res.status(500).json({ error: "Could not fetch blogs." });
  }
});

// ─── GET /blogs/:id ──
// Fetch a single blog by ID
router.get("/blogs/:id", async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ error: "Blog not found" });
    return res.status(200).json({ success: true, blog: normalizeBlog(blog) });
  } catch (error) {
    return res.status(500).json({ error: "Could not fetch blog." });
  }
});

// ─── PATCH /blogs/:id/status ──
// Update a blog review status from the dashboard.
// This is the SECOND admin approval gate (content review). Approving a
// blog here is the ONLY publish step needed — "approved" auto-completes
// to "published" immediately so the post goes live without a separate
// manual publish click.
router.patch("/blogs/:id/status", async (req, res) => {
  const { status } = req.body;
  const allowedStatuses = ["pending", "approved", "rejected", "published"];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ error: "Invalid blog status." });
  }

  // Admin approval auto-publishes — there's no separate site-side publish
  // step for a blog, so "approved" and "published" collapse into one action.
  const finalStatus = status === "approved" ? "published" : status;

  try {
    const blog = await Blog.findByIdAndUpdate(
      req.params.id,
      { status: finalStatus },
      { new: true }
    );

    if (!blog) return res.status(404).json({ error: "Blog not found" });

    // Reflect the content-review outcome back onto the calendar slot this
    // blog was generated from (if any), so the calendar view stays accurate.
    if (blog.calendarId && blog.slotKey) {
      const slotStatus = finalStatus === "published" ? "PUBLISHED" : finalStatus === "rejected" ? "REJECTED" : null;
      if (slotStatus) {
        await syncSlotStatus(blog.calendarId, blog.slotKey, "blog", slotStatus);
      }
    }

    return res.status(200).json({ success: true, blog: normalizeBlog(blog) });
  } catch (error) {
    return res.status(500).json({ error: "Failed to update blog status." });
  }
});

// ─── PATCH /blogs/:id/rate ──
// Like or dislike a blog
router.patch("/blogs/:id", async (req, res) => {
  try {
    const updates = req.body || {};
    const allowedFields = ["title", "summary", "content", "metaDescription", "category", "cta", "tags", "seoKeywords", "emotionalHook", "h1", "h2s"];
    const cleaned = {};

    Object.entries(updates).forEach(([key, value]) => {
      if (allowedFields.includes(key)) cleaned[key] = value;
    });

    const blog = await Blog.findByIdAndUpdate(req.params.id, cleaned, { new: true });
    if (!blog) return res.status(404).json({ error: "Blog not found" });
    return res.status(200).json({ success: true, blog: normalizeBlog(blog) });
  } catch (error) {
    return res.status(500).json({ error: "Failed to update blog content." });
  }
});

router.patch("/blogs/:id/rate", async (req, res) => {
  const { type } = req.body;
  try {
    const update = type === "like" ? { $inc: { likes: 1 } } : { $inc: { dislikes: 1 } };
    const blog = await Blog.findByIdAndUpdate(req.params.id, update, { new: true });
    return res.status(200).json({ success: true, blog });
  } catch (error) {
    return res.status(500).json({ error: "Failed to update rating." });
  }
});

// ─── GET /blogs/:id/related ──
// Fetch related blogs based on category
router.get("/blogs/:id/related", async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ error: "Blog not found" });
    const related = await Blog.find({ _id: { $ne: blog._id }, category: blog.category })
      .sort({ createdAt: -1 }).limit(3);
    return res.status(200).json({ success: true, related });
  } catch (error) {
    return res.status(500).json({ error: "Could not fetch related blogs." });
  }
});

module.exports = router;