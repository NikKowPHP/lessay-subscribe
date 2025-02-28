'use client';

import { DetailedAnalysis } from './DetailedAnalysis';
import { BasicAnalysis } from './BasicAnalysis';
import { RecordingCallToAction } from './RecordingCallToAction';
import { LoadingAnimation } from './LoadingAnimation';
import { RecordingHeader } from './RecordingHeader';
import { ButtonConfig } from './RecordingButtonConfig';
import { useRecordingContext } from '@/context/recording-context';
import { MetaScript } from './RecordingMetaScript';



export default function Recording() {

  const {
    audioURL,
    aiResponse,
    detailedAiResponse,
    isProcessing,
    resetRecording,
    isDeepAnalysis,
    setIsDeepAnalysis,
    posthogCapture,
  } = useRecordingContext();

  



 
  const onWaitlistClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    posthogCapture('join_waitlist_clicked');
  };


  const onResetRecordingClick = () => {
    posthogCapture('try_another_recording_clicked');
    resetRecording();
  };

  const onDeepAnalysisClick = () => {
    setIsDeepAnalysis(!isDeepAnalysis);
    posthogCapture('deep_analysis_toggled');
  };



  const RecordingButtons = () => {
    return (
      <div className="flex items-center gap-4">
      {(() => {
        const { text, action, disabled, className } = ButtonConfig();
        return (
          <button
            onClick={action}
            disabled={disabled}
            className={`
            px-6 py-2 rounded-full font-medium transition-all duration-200
            border border-black dark:border-white
            text-black dark:text-white
            ${className}
          `}
          >
            {text}
          </button>
        );
      })()}

      <button
        onClick={onDeepAnalysisClick}
        className={`
          px-6 py-2 rounded-full font-medium transition-all duration-200
          ${isDeepAnalysis ? 'bg-blue-500 text-white' : 'border border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white'}
          
        `}
      >
        Deep Analysis
      </button>
    </div>
      )
  }

  

 


const DeepAnalysisMessage = () => {
  return (
    <div className="mt-2">
    <p className="text-sm text-gray-600 dark:text-gray-400">
      Please provide a minimum 1 minute of recording for deep
      analysis.
    </p>
  </div>
  )
}
const WordsDisclaimer = () => {
  return (
    <div className="mt-2">
      <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
        To ensure unbiased analysis, please avoid using terms related to specific
        demographics such as race, religion, gender, or nationality. Focus on
        using neutral and objective language. Additionally, to ensure broad
        applicability and understanding, avoid using country-specific terms,
        proper names, or other language that may be regionally exclusive. Aim
        for precise definitions and clear, detailed analysis using generic and
        widely understood language.
      </p>
    </div>
  );
};
  

  return (
    <section
      aria-label="Voice Recording and Accent Analysis"
      className="w-full max-w-4xl bg-white/80 dark:bg-black/80 backdrop-blur-sm p-6 rounded-xl border border-black/[.08] dark:border-white/[.145]"
    >
      <MetaScript />

      <article itemScope itemType="https://schema.org/HowTo">

        <RecordingHeader />
 
 

        <div className="flex flex-col items-center space-y-6">
       
          <RecordingButtons />

      

          {/* Conditional message for Deep Analysis */}
          {isDeepAnalysis && (
           <DeepAnalysisMessage />
          )}

          <WordsDisclaimer />

          {/* Audio Player */}
          {audioURL && (
            <div className="w-full max-w-md">
              <audio src={audioURL} controls className="w-full " />
            </div>
          )}

          {/* Loading Animation */}
          {isProcessing && (
            <LoadingAnimation />
          )}

          {/* AI Response */}
          {!isProcessing && aiResponse && (
            <BasicAnalysis aiResponse={aiResponse} />
          )}

          {/* Detailed Accent Analysis Section */}
          {!isProcessing && detailedAiResponse && (
              <DetailedAnalysis detailedAiResponse={detailedAiResponse} />
          )}
          {/* Call to Action */}
          {!isProcessing && (aiResponse || detailedAiResponse) && (
            <RecordingCallToAction onWaitlistClick={onWaitlistClick} onResetRecordingClick={onResetRecordingClick} />
          )}
        </div>
      </article>
    </section>
   
  );
}
