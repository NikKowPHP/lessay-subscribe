export const MetaScript = () => {
  return (
    <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{
      __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name: 'Analyze Your Accent with AI',
        description:
          'Get instant AI-powered feedback on your pronunciation, fluency, and accent characteristics in any language',
        estimatedCost: {
          '@type': 'MonetaryAmount',
          currency: 'USD',
          value: '0',
        },
        tool: [
          {
            '@type': 'HowToTool',
            name: 'Microphone',
          },
        ],
        step: [
          {
            '@type': 'HowToStep',
            name: 'Allow Microphone Access',
            text: 'Grant microphone permissions when prompted to enable voice recording',
            url: 'https://yourdomain.com#recording',
          },
          {
            '@type': 'HowToStep',
            name: 'Start Recording',
            text: 'Click the start button and speak clearly in any language',
            url: 'https://yourdomain.com#recording',
          },
          {
            '@type': 'HowToStep',
            name: 'Complete Recording',
            text: 'Click stop when finished to submit your recording',
            url: 'https://yourdomain.com#recording',
          },
          {
            '@type': 'HowToStep',
            name: 'Get Analysis',
            text: 'Receive detailed AI analysis of your pronunciation and accent characteristics',
            url: 'https://yourdomain.com#analysis',
          },
        ],
        totalTime: 'PT2M',
      }),
    }}
  />
  )
}