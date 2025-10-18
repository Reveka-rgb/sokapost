import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          backgroundColor: '#000',
          color: '#fff',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 80,
            fontWeight: 'bold',
            marginBottom: 20,
          }}
        >
          SokaPost
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 32,
            color: '#999',
          }}
        >
          Social Media Management
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
