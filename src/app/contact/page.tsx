"use client";

import { useState } from "react";

const CATEGORIES = ["Question", "Bug Report", "Feature Request", "Other"] as const;

export default function ContactPage() {
  const [category, setCategory] = useState<string>("Question");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, message }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send");
      }

      setSent(true);
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }

    setSending(false);
  }

  if (sent) {
    return (
      <div className="max-w-lg mx-auto py-12 text-center">
        <div className="rounded-lg border border-brew-200 bg-white p-8">
          <div className="text-3xl mb-3">&#9993;</div>
          <h2 className="text-lg font-bold text-brew-800 mb-2">
            Message sent!
          </h2>
          <p className="text-sm text-brew-500 mb-6">
            Thanks for reaching out. We'll get back to you as soon as we can.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setSent(false)}
              className="rounded-lg border border-brew-200 px-4 py-2 text-sm font-medium text-brew-700 hover:bg-brew-50 transition-colors"
            >
              Send Another
            </button>
            <a
              href="/"
              className="rounded-lg bg-brew-800 px-4 py-2 text-sm font-medium text-white hover:bg-brew-700 transition-colors"
            >
              Back to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-brew-900">
          Contact Us
        </h1>
        <p className="text-sm text-brew-500 mt-1">
          Questions, feedback, or feature ideas — we'd love to hear from you.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-lg border border-brew-200 bg-white p-5 sm:p-6 space-y-5"
      >
        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-brew-700 mb-2">
            What's this about?
          </label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                  category === cat
                    ? "bg-brew-800 text-white"
                    : "bg-brew-50 text-brew-600 border border-brew-200 hover:border-brew-400"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Message */}
        <div>
          <label
            htmlFor="message"
            className="block text-sm font-medium text-brew-700 mb-2"
          >
            Your message
          </label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            rows={6}
            maxLength={5000}
            placeholder="Tell us what's on your mind..."
            className="block w-full rounded-lg border border-brew-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-brew-500 focus:outline-none focus:ring-1 focus:ring-brew-500 resize-y"
          />
          <p className="text-xs text-brew-400 mt-1 text-right">
            {message.length}/5000
          </p>
        </div>

        {error && <p className="text-sm text-margin-bad">{error}</p>}

        <button
          type="submit"
          disabled={sending || message.trim().length === 0}
          className="w-full rounded-lg bg-brew-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-brew-700 disabled:opacity-50 transition-colors"
        >
          {sending ? "Sending..." : "Send Message"}
        </button>
      </form>
    </div>
  );
}
