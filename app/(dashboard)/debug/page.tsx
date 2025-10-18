'use client'

import { useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'

export default function DebugPage() {
  const [text, setText] = useState('Testing Threads API from SokaPost! 🚀')
  const [imageUrl, setImageUrl] = useState('')
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [testingImage, setTestingImage] = useState(false)
  const [imageTestResult, setImageTestResult] = useState<any>(null)
  const [schedulerStatus, setSchedulerStatus] = useState<any>(null)
  const [loadingStatus, setLoadingStatus] = useState(false)
  const [triggeringScheduler, setTriggeringScheduler] = useState(false)
  const [startingScheduler, setStartingScheduler] = useState(false)

  const handleTestImage = async () => {
    if (!imageUrl) {
      toast.error('Enter image URL first')
      return
    }

    try {
      setTestingImage(true)
      setImageTestResult(null)

      const fullUrl = imageUrl.startsWith('http') 
        ? imageUrl 
        : `${window.location.origin}${imageUrl}`

      const response = await axios.get('/api/test-image', {
        params: { url: fullUrl }
      })

      setImageTestResult(response.data)
      
      if (response.data.accessible) {
        toast.success('✅ Image is accessible!')
      } else {
        toast.error('❌ Image is NOT accessible')
      }
    } catch (error: any) {
      setImageTestResult(error.response?.data || { error: error.message })
      toast.error('❌ Image test failed')
    } finally {
      setTestingImage(false)
    }
  }

  const handleCheckScheduler = async () => {
    try {
      setLoadingStatus(true)
      const response = await axios.get('/api/debug/scheduler-status')
      setSchedulerStatus(response.data)
      toast.success('Scheduler status loaded')
    } catch (error: any) {
      toast.error('Failed to load scheduler status')
      console.error(error)
    } finally {
      setLoadingStatus(false)
    }
  }

  const handleStartScheduler = async () => {
    try {
      setStartingScheduler(true)
      const response = await axios.post('/api/debug/start-scheduler')
      
      if (response.data.success) {
        toast.success('Scheduler started successfully!')
      } else {
        toast.error('Failed to start scheduler')
      }
      
      // console.log('Start result:', response.data)
      
      // Refresh status after start
      setTimeout(handleCheckScheduler, 500)
    } catch (error: any) {
      toast.error('Failed to start scheduler')
      console.error(error)
    } finally {
      setStartingScheduler(false)
    }
  }

  const handleTriggerScheduler = async () => {
    try {
      setTriggeringScheduler(true)
      const response = await axios.post('/api/debug/trigger-scheduler')
      toast.success(`Scheduler triggered! ${response.data.postsFound} posts found`)
      // console.log('Trigger result:', response.data)
      
      // Refresh status after trigger
      setTimeout(handleCheckScheduler, 1000)
    } catch (error: any) {
      toast.error('Failed to trigger scheduler')
      console.error(error)
    } finally {
      setTriggeringScheduler(false)
    }
  }

  const handleTest = async () => {
    try {
      setTesting(true)
      setResult(null)

      // console.log('Testing with:', { text, imageUrl })

      const response = await axios.post('/api/debug/threads-test', {
        text,
        imageUrl: imageUrl || undefined
      })

      // console.log('Test result:', response.data)
      setResult(response.data)
      toast.success('Test completed! Check console for details.')
    } catch (error: any) {
      console.error('Test failed:', error)
      setResult(error.response?.data || { error: error.message })
      toast.error('Test failed! Check console for details.')
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Debug Tools</h1>
        <p className="text-gray-600 mt-2">Test Threads API & Scheduler</p>
      </div>

      {/* Scheduler Debug Section */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4 mb-6">
        <h2 className="text-xl font-bold text-gray-900">📅 Scheduler Status</h2>
        
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={handleCheckScheduler}
            disabled={loadingStatus}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loadingStatus ? '🔄 Loading...' : '📊 Check Status'}
          </button>
          
          {schedulerStatus && !schedulerStatus.scheduler.running && (
            <button
              onClick={handleStartScheduler}
              disabled={startingScheduler}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {startingScheduler ? '🔄 Starting...' : '🚀 Start Scheduler'}
            </button>
          )}
          
          <button
            onClick={handleTriggerScheduler}
            disabled={triggeringScheduler}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {triggeringScheduler ? '🔄 Running...' : '▶️ Trigger Now'}
          </button>
        </div>

        {schedulerStatus && (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Scheduler Info:</h3>
              <div className="text-sm space-y-1">
                <div>Status: <span className={schedulerStatus.scheduler.running ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                  {schedulerStatus.scheduler.running ? '✅ Running' : '❌ Stopped'}
                </span></div>
                <div>Current Time: {new Date(schedulerStatus.scheduler.currentTime).toLocaleString()}</div>
                <div>Total Scheduled: <span className="font-semibold">{schedulerStatus.posts.totalScheduled}</span></div>
                <div>Overdue (should publish): <span className="font-semibold text-orange-600">{schedulerStatus.posts.overdue}</span></div>
              </div>
            </div>

            {schedulerStatus.posts.scheduledPosts.length > 0 && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Scheduled Posts:</h3>
                <div className="space-y-2">
                  {schedulerStatus.posts.scheduledPosts.map((post: any) => (
                    <div key={post.id} className={`text-sm p-2 rounded ${post.isPast ? 'bg-orange-100' : 'bg-white'}`}>
                      <div className="font-semibold">{post.content}</div>
                      <div className="text-xs text-gray-600">
                        Scheduled: {new Date(post.scheduledAt).toLocaleString()} 
                        {post.isPast && <span className="text-orange-600 font-semibold ml-2">⚠️ OVERDUE</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {schedulerStatus.posts.recentPosts.length > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Recent Posts (Last 10):</h3>
                <div className="space-y-2">
                  {schedulerStatus.posts.recentPosts.map((post: any) => (
                    <div key={post.id} className="text-sm p-2 bg-white rounded">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div>{post.content}</div>
                          <div className="text-xs text-gray-600 mt-1">
                            Status: <span className={`font-semibold ${
                              post.status === 'published' ? 'text-green-600' :
                              post.status === 'scheduled' ? 'text-blue-600' :
                              post.status === 'failed' ? 'text-red-600' :
                              'text-gray-600'
                            }`}>{post.status}</span>
                          </div>
                          {post.scheduledAt && <div className="text-xs text-gray-500">Scheduled: {new Date(post.scheduledAt).toLocaleString()}</div>}
                          {post.publishedAt && <div className="text-xs text-gray-500">Published: {new Date(post.publishedAt).toLocaleString()}</div>}
                          {post.errorMessage && <div className="text-xs text-red-600">Error: {post.errorMessage}</div>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Threads API Test Section */}
      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <h2 className="text-xl font-bold text-gray-900">🧪 Test Threads API</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Post Text *
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="What's on your mind?"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Image URL (optional)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="/uploads/image.jpg or https://..."
            />
            <button
              onClick={handleTestImage}
              disabled={testingImage || !imageUrl}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {testingImage ? '🔍 Testing...' : '🔍 Test Image'}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Leave empty for text-only post. Click "Test Image" to check if accessible.
          </p>
        </div>

        {imageTestResult && (
          <div className={`p-4 rounded-lg border ${
            imageTestResult.accessible 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <h3 className="font-semibold mb-2">
              {imageTestResult.accessible ? '✅ Image Accessible' : '❌ Image NOT Accessible'}
            </h3>
            <pre className="text-xs overflow-x-auto">
              {JSON.stringify(imageTestResult, null, 2)}
            </pre>
          </div>
        )}

        <button
          onClick={handleTest}
          disabled={testing || !text}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
        >
          {testing ? '🔄 Testing...' : '🚀 Test Publish to Threads'}
        </button>

        {result && (
          <div className="mt-6">
            <h3 className="font-semibold text-gray-900 mb-2">Result:</h3>
            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-900 mb-2">📋 Instructions:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-yellow-800">
            <li>Enter your post text</li>
            <li>Optionally add an image URL</li>
            <li>Click "Test Publish"</li>
            <li>Open browser console (F12) to see detailed logs</li>
            <li>Check your Threads profile to verify post appears</li>
          </ol>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">🔍 What to check:</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
            <li>Container creation response (should have ID)</li>
            <li>Publish response (should have ID)</li>
            <li>Any error messages from Threads API</li>
            <li>Image URL accessibility (if using images)</li>
          </ul>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-900 mb-2">✅ Image Endpoint Updated!</h3>
          <p className="text-sm text-green-800 mb-3">
            Images sekarang di-serve melalui <code>/api/media/[filename]</code> dengan proper headers untuk Meta/Threads:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm text-green-800 mb-3">
            <li>✅ Proper Content-Type headers</li>
            <li>✅ CORS headers untuk akses external</li>
            <li>✅ Content-Length untuk Meta crawlers</li>
            <li>✅ HEAD request support (Meta check)</li>
          </ul>
          <p className="text-sm text-green-800">
            <strong>Test:</strong> Upload image → akan auto convert ke <code>/api/media/[filename]</code>
          </p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-900 mb-2">🔧 Alternative: External Hosting</h3>
          <p className="text-sm text-yellow-800 mb-2">
            Jika masih error, gunakan external image hosting:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm text-yellow-800">
            <li><strong>Imgur:</strong> imgur.com/upload → Copy "Direct Link"</li>
            <li><strong>PostImages:</strong> postimages.org → Copy "Direct Link"</li>
            <li><strong>ImgBB:</strong> imgbb.com → Copy "Direct Link"</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
