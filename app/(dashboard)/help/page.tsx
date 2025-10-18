export default function HelpPage() {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-6 flex-shrink-0">
        <h1 className="text-xl font-semibold text-gray-900">Help & Support</h1>
        <p className="text-sm text-gray-500 mt-1">
          Documentation, features, and troubleshooting guide
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto space-y-4">
          
          {/* Getting Started */}
          <section className="bg-white rounded-lg border border-gray-200 p-4">
            <h2 className="text-base font-semibold text-gray-900 mb-3">Getting Started</h2>
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">1. Connect Your Account</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Go to Connections page and connect your Threads account. Threads is required for all features. Instagram is optional for cross-posting.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">2. Create Your First Post</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Click the Create button or go to Calendar page. Write your content, add media if needed, then choose to publish now or schedule for later.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">3. Enable Auto Reply (Optional)</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Navigate to Auto Reply settings under Threads menu. Enable AI mode for automatic replies or use keyword mode for predefined responses.
                </p>
              </div>
            </div>
          </section>

          {/* Features */}
          <section className="bg-white rounded-lg border border-gray-200 p-4">
            <h2 className="text-base font-semibold text-gray-900 mb-3">Features</h2>
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">Calendar & Scheduling</h3>
                <p className="text-sm text-gray-600 leading-relaxed mb-1">
                  Visual calendar to manage all your scheduled posts. Click any date to create new post or view existing ones.
                </p>
                <ul className="text-sm text-gray-600 space-y-0.5 list-disc list-inside ml-2">
                  <li>Schedule posts up to months in advance</li>
                  <li>Drag and drop to reschedule</li>
                  <li>Status indicators: Draft, Scheduled, Published, Failed</li>
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">Auto Reply (Threads)</h3>
                <p className="text-sm text-gray-600 leading-relaxed mb-1">
                  Automatically respond to replies on your Threads posts using AI or keywords.
                </p>
                <ul className="text-sm text-gray-600 space-y-0.5 list-disc list-inside ml-2">
                  <li>AI Mode: Gemini AI generates contextual replies</li>
                  <li>Keyword Mode: Match keywords to predefined responses</li>
                  <li>Rate limiting: Max 30 replies per hour</li>
                  <li>Custom AI prompts for personalized tone</li>
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">Insights (Threads)</h3>
                <p className="text-sm text-gray-600 leading-relaxed mb-1">
                  View performance metrics for your Threads posts.
                </p>
                <ul className="text-sm text-gray-600 space-y-0.5 list-disc list-inside ml-2">
                  <li>Views, likes, replies, and reposts count</li>
                  <li>Engagement rate tracking</li>
                  <li>Best performing posts analysis</li>
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">Search (Threads)</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Search for Threads users and view their profiles. Useful for finding potential collaboration partners or monitoring competitors.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">Media Library</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Upload and manage images and videos. Drag and drop or click to upload. Supported formats: JPEG, PNG, GIF, MP4.
                </p>
              </div>
            </div>
          </section>

          {/* Troubleshooting */}
          <section className="bg-white rounded-lg border border-gray-200 p-4">
            <h2 className="text-base font-semibold text-gray-900 mb-3">Troubleshooting</h2>
            <div className="space-y-3">
              <div className="border-l-2 border-red-600 pl-3">
                <h3 className="text-sm font-semibold text-red-900 mb-1">Post Failed to Publish</h3>
                <p className="text-sm text-gray-600 leading-relaxed mb-1">Possible causes:</p>
                <ul className="text-sm text-gray-600 space-y-0.5 list-disc list-inside ml-2">
                  <li>Token expired: Reconnect your Threads account</li>
                  <li>Content violates platform guidelines</li>
                  <li>Media file too large or unsupported format</li>
                  <li>Network connection issues</li>
                </ul>
                <p className="text-sm text-gray-600 mt-1">
                  <span className="font-semibold">Solution:</span> Check error message in post details. Reconnect account if needed. Edit and retry.
                </p>
              </div>

              <div className="border-l-2 border-red-600 pl-3">
                <h3 className="text-sm font-semibold text-red-900 mb-1">Auto Reply Not Working</h3>
                <p className="text-sm text-gray-600 leading-relaxed mb-1">Checklist:</p>
                <ul className="text-sm text-gray-600 space-y-0.5 list-disc list-inside ml-2">
                  <li>Auto Reply is enabled in settings</li>
                  <li>Threads account is connected</li>
                  <li>Rate limit not exceeded (30/hour)</li>
                  <li>GEMINI_API_KEY configured in environment</li>
                </ul>
              </div>

              <div className="border-l-2 border-red-600 pl-3">
                <h3 className="text-sm font-semibold text-red-900 mb-1">Media Upload Failed</h3>
                <p className="text-sm text-gray-600 leading-relaxed mb-1">Common issues:</p>
                <ul className="text-sm text-gray-600 space-y-0.5 list-disc list-inside ml-2">
                  <li>File size exceeds 10MB limit</li>
                  <li>Unsupported file format</li>
                  <li>Browser storage quota exceeded</li>
                </ul>
                <p className="text-sm text-gray-600 mt-1">
                  <span className="font-semibold">Solution:</span> Compress image/video before upload. Use supported formats only.
                </p>
              </div>

              <div className="border-l-2 border-red-600 pl-3">
                <h3 className="text-sm font-semibold text-red-900 mb-1">Scheduled Posts Not Publishing</h3>
                <p className="text-sm text-gray-600 leading-relaxed mb-1">
                  Background scheduler runs every 5 minutes. If server is stopped, scheduled posts won't publish.
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  <span className="font-semibold">Solution:</span> Ensure server is running. Check server logs for errors. Reconnect account if token expired.
                </p>
              </div>
            </div>
          </section>

          {/* Tips */}
          <section className="bg-white rounded-lg border border-gray-200 p-4">
            <h2 className="text-base font-semibold text-gray-900 mb-3">Tips & Best Practices</h2>
            <div className="space-y-2">
              <div className="border-l-2 border-green-600 pl-3">
                <p className="text-sm text-gray-600 leading-relaxed">
                  <span className="font-semibold text-green-900">Optimal Posting Times:</span> Check Insights to find when your audience is most active. Schedule posts during those times for better engagement.
                </p>
              </div>
              <div className="border-l-2 border-green-600 pl-3">
                <p className="text-sm text-gray-600 leading-relaxed">
                  <span className="font-semibold text-green-900">AI Auto Reply:</span> Write a detailed custom prompt describing your brand voice and preferred response style for better AI replies.
                </p>
              </div>
              <div className="border-l-2 border-green-600 pl-3">
                <p className="text-sm text-gray-600 leading-relaxed">
                  <span className="font-semibold text-green-900">Media Optimization:</span> Compress images to reduce file size. Square format (1:1) works best for both Threads and Instagram.
                </p>
              </div>
              <div className="border-l-2 border-green-600 pl-3">
                <p className="text-sm text-gray-600 leading-relaxed">
                  <span className="font-semibold text-green-900">Backup Strategy:</span> Export important content regularly. Scheduled posts are preserved when reconnecting accounts.
                </p>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="bg-white rounded-lg border border-gray-200 p-4">
            <h2 className="text-base font-semibold text-gray-900 mb-3">Frequently Asked Questions</h2>
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">Can I connect multiple Instagram accounts?</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Yes. You can connect multiple Instagram Business accounts. Each account will be listed separately in Connections page.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">How long do tokens last?</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Threads tokens expire after 60 days. Instagram tokens expire after 60 days. The system attempts to refresh tokens automatically.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">Is my data secure?</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Yes. Access tokens are encrypted before storage. Passwords are hashed with bcrypt. All API communications use HTTPS.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">What happens if I disconnect an account?</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Scheduled posts are preserved. You can reconnect anytime to resume posting. Published posts remain on the platform.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">Can I edit a scheduled post?</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Yes. Go to Calendar or Posts page, click the post, then edit and save. Changes apply to the next scheduled publish time.
                </p>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  )
}
