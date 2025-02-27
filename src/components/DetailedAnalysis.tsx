import { DetailedAIResponse } from "@/models/AiResponse.model";
import PhonemePlayer from "./PhonemePlayer";

export const DetailedAnalysis = ({detailedAiResponse}: {detailedAiResponse: DetailedAIResponse}) => {
  return !detailedAiResponse ? null : (
    <div className="mt-8 space-y-6">
    <h2 className="text-xl font-semibold mb-4">Detailed Accent Analysis</h2>
    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
      The audio of phonetics is just an approximation of the actual pronunciation due to limitations with text-to-speech technology.
    </p>
    
    {/* Accent Analysis Section */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Accent Classification */}
      <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
        <h3 className="font-semibold mb-3">Accent Classification</h3>
        <div className="space-y-2">
          <p className="flex justify-between">
            <span>Language Analyzed:</span>
            <span className="font-medium">
              {detailedAiResponse.accent_analysis.language_analyzed}
            </span>
          </p>
          <p className="flex justify-between">
            <span>Accent Type:</span>
            <span className="font-medium">
              {detailedAiResponse.accent_analysis.accent_classification.accent_type}
            </span>
          </p>
          <p className="flex flex-col md:flex-row justify-between">
            <span>Specific Accent:</span>
            <span className="font-medium">
              {detailedAiResponse.accent_analysis.accent_classification.specific_accent}
            </span>
          </p>
          <p className="flex  justify-between">
            <span>Confidence:</span>
            <span className="text-green-600">
              {detailedAiResponse.accent_analysis.accent_classification.confidence_level}%
            </span>
          </p>
          <p className="flex  justify-between">
            <span>Accent Strength:</span>
            <span className="font-medium">
              {detailedAiResponse.accent_analysis.accent_classification.accent_strength}
            </span>
          </p>
        </div>
      </div>

      {/* Speaker Background */}
      <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
        <h3 className="font-semibold mb-3">Speaker Background</h3>
        <div className="space-y-2">
          <p className="flex justify-between">
            <span>Probable L1:</span>
            <span className="font-medium">
              {detailedAiResponse.accent_analysis.speaker_background.probable_native_language}
            </span>
          </p>
          <p className="flex justify-between">
            <span>Probable Region:</span>
            <span className="font-medium">
              {detailedAiResponse.accent_analysis.speaker_background.probable_region}
            </span>
          </p>
          <p className="flex justify-between">
            <span>Confidence:</span>
            <span className="text-green-600">
              {detailedAiResponse.accent_analysis.speaker_background.confidence_level}%
            </span>
          </p>
          <div className="mt-2">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Supporting Evidence:</p>
            <ul className="list-disc list-inside text-sm">
              {detailedAiResponse.accent_analysis.speaker_background.supporting_evidence.map(
                (evidence: string, index: number) => (
                  <li key={index}>{evidence}</li>
                )
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>

    {/* Phonetic Analysis */}
    <div className="space-y-4">
      <h3 className="font-semibold">Detailed Phonetic Analysis</h3>
      
      {/* Vowel Production */}
      <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
        <h4 className="font-medium mb-3">Vowel Production</h4>
        <div className="space-y-3">
          {detailedAiResponse.phonetic_analysis.vowel_production.map(
            (vowel: {
              phoneme: string;
              standard_realization: string;
              observed_realization: string;
              example_word: string;
              timestamp: number;
              analysis: string;
              accent_marker: boolean;
            }
            , index: number) => (
              <div key={index} className="border-b border-gray-200 dark:border-gray-700 pb-2 last:border-0">
                <div className="flex justify-between mb-1">
                  <span className="font-medium">{vowel.phoneme}</span>
                  <span className="text-sm text-gray-600">at {vowel.timestamp}s</span>
                </div>
                <p className="text-sm mb-1">Example: &quot;{vowel.example_word}&quot;</p>
                <div className="flex flex-col sm:flex-row gap-2 justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">Standard: {vowel.standard_realization}</span>
                    <PhonemePlayer 
                      ipa={vowel.phoneme} 
                      language={detailedAiResponse.accent_analysis.analyzed_language_code} 
                      size="sm" 
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">Observed: {vowel.observed_realization}</span>
                    <PhonemePlayer 
                      ipa={vowel.observed_realization.split(' ')[0]} 
                      language={detailedAiResponse.accent_analysis.analyzed_language_code} 
                      size="sm" 
                    />
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-1">{vowel.analysis}</p>
                {vowel.accent_marker && (
                  <span className="inline-block mt-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 text-xs rounded-full">
                    Accent marker
                  </span>
                )}
              </div>
            )
          )}
        </div>
      </div>

      {/* Consonant Production */}
      <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
        <h4 className="font-medium mb-3">Consonant Production</h4>
        <div className="space-y-3">
          {detailedAiResponse.phonetic_analysis.consonant_production.map(
            (consonant: {
              phoneme: string;
              standard_realization: string;
              observed_realization: string;
              example_word: string;
              timestamp: number;
              analysis: string;
              accent_marker: boolean;
            }, index: number) => (
              <div key={index} className="border-b border-gray-200 dark:border-gray-700 pb-2 last:border-0">
                <div className="flex justify-between mb-1">
                  <span className="font-medium">{consonant.phoneme}</span>
                  <span className="text-sm text-gray-600">at {consonant.timestamp}s</span>
                </div>
                <p className="text-sm mb-1">Example: &quot;{consonant.example_word}&quot;</p>
                <div className="flex flex-col sm:flex-row gap-2 justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">Standard: {consonant.standard_realization}</span>
                    <PhonemePlayer 
                      ipa={consonant.phoneme} 
                      language={detailedAiResponse.accent_analysis.analyzed_language_code} 
                      size="sm" 
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">Observed: {consonant.observed_realization}</span>
                    <PhonemePlayer 
                      ipa={consonant.observed_realization.split(' ')[0]} 
                      language={detailedAiResponse.accent_analysis.analyzed_language_code} 
                      size="sm" 
                    />
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-1">{consonant.analysis}</p>
                {consonant.accent_marker && (
                  <span className="inline-block mt-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 text-xs rounded-full">
                    Accent marker
                  </span>
                )}
              </div>
            )
          )}
        </div>
      </div>
    </div>

    {/* Prosodic Features */}
    <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
      <h4 className="font-medium mb-3">Prosodic Features</h4>
      <div className="space-y-4">
        {/* Rhythm Patterns */}
        <div>
          <h5 className="text-sm font-medium mb-2">Rhythm Patterns</h5>
          <p className="text-sm mb-2">
            {detailedAiResponse.prosodic_features.rhythm_patterns.description}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
            <div className="text-sm">
              <span className="font-medium">Standard Pattern:</span> {detailedAiResponse.prosodic_features.rhythm_patterns.standard_pattern}
            </div>
            <div className="text-sm">
              <span className="font-medium">Observed Pattern:</span> {detailedAiResponse.prosodic_features.rhythm_patterns.observed_pattern}
            </div>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 italic">
            Association: {detailedAiResponse.prosodic_features.rhythm_patterns.accent_association}
          </p>
        </div>

        {/* Stress Patterns */}
        <div>
          <h5 className="text-sm font-medium mb-2">Stress Patterns</h5>
          <div className="space-y-2">
            <div>
              <p className="text-sm font-medium">Word Level:</p>
              <p className="text-sm">{detailedAiResponse.prosodic_features.stress_patterns.word_level.description}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 italic">
                Association: {detailedAiResponse.prosodic_features.stress_patterns.word_level.accent_association}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">Sentence Level:</p>
              <p className="text-sm">{detailedAiResponse.prosodic_features.stress_patterns.sentence_level.description}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 italic">
                Association: {detailedAiResponse.prosodic_features.stress_patterns.sentence_level.accent_association}
              </p>
            </div>
          </div>
        </div>

        {/* Intonation */}
        <div>
          <h5 className="text-sm font-medium mb-2">Intonation</h5>
          <ul className="list-disc list-inside text-sm mb-1">
            {detailedAiResponse.prosodic_features.intonation.patterns.map((pattern: string, index: number) => (
              <li key={index}>{pattern}</li>
            ))}
          </ul>
          <p className="text-xs text-gray-600 dark:text-gray-400 italic">
            Association: {detailedAiResponse.prosodic_features.intonation.accent_association}
          </p>
        </div>
      </div>
    </div>

    {/* Diagnostic Accent Markers */}
    <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
      <h4 className="font-medium mb-3">Diagnostic Accent Markers</h4>
      <div className="space-y-4">
        {detailedAiResponse.diagnostic_accent_markers.map((marker: {
          feature: string;
          description: string;
          example: string;
          timestamp: number;
          accent_association: string;
          frequency: string;
        }, index: number) => (
          <div key={index} className="border-l-4 border-yellow-500 pl-4">
            <div className="flex justify-between mb-1">
              <h5 className="font-medium">{marker.feature}</h5>
              <span className="text-xs text-gray-600">Frequency: {marker.frequency}</span>
            </div>
            <p className="text-sm mb-1">{marker.description}</p>
            <p className="text-sm mb-1">Example: &quot;{marker.example}&quot; (at {marker.timestamp}s)</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 italic">
              Association: {marker.accent_association}
            </p>
          </div>
        ))}
      </div>
    </div>

    {/* Proficiency Assessment */}
    <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
      <h4 className="font-medium mb-3">Proficiency Assessment</h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="text-center p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
            {detailedAiResponse.proficiency_assessment.intelligibility_score}%
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">Intelligibility</p>
        </div>
        <div className="text-center p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <div className="text-xl font-bold text-green-600 dark:text-green-400">
            {detailedAiResponse.proficiency_assessment.fluency_rating}%
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">Fluency</p>
        </div>
        <div className="text-center p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
            {detailedAiResponse.proficiency_assessment.comprehensibility}%
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">Comprehensibility</p>
        </div>
        <div className="text-center p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <div className="text-xl font-bold text-orange-600 dark:text-orange-400">
            {detailedAiResponse.proficiency_assessment.CEFR_pronunciation_level}
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">CEFR Level</p>
        </div>
      </div>
      <p className="text-sm italic">
        {detailedAiResponse.proficiency_assessment.accent_impact_assessment}
      </p>
    </div>

    {/* Improvement Plan */}
    <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
      <h4 className="font-medium mb-3">Personalized Improvement Plan</h4>
      <div className="space-y-4">
        {detailedAiResponse.improvement_plan.priority_areas.map(
          (area: {
            focus: string;
            importance: "High" | "Medium" | "Low";
            exercises: string[];
            expected_timeline: string;
          }, index: number) => (
            <div key={index} className="border-l-4 border-blue-500 pl-4">
              <h5 className="font-medium">{area.focus}</h5>
              <div className="flex items-center gap-2 my-1">
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  area.importance === 'High'
                    ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    : area.importance === 'Medium'
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                }`}>
                  {area.importance} priority
                </span>
                <span className="text-sm text-gray-600">{area.expected_timeline}</span>
              </div>
              <ul className="list-disc list-inside text-sm">
                {area.exercises.map((exercise, i) => (
                  <li key={i}>{exercise}</li>
                ))}
              </ul>
            </div>
          )
        )}
      </div>
      
      {/* Recommended Resources */}
      <div className="mt-4">
        <h5 className="text-sm font-medium mb-2">Recommended Resources</h5>
        <ul className="list-disc list-inside text-sm">
          {detailedAiResponse.improvement_plan.recommended_resources.map(
            (resource: string, index: number) => (
              <li key={index}>{resource}</li>
            )
          )}
        </ul>
      </div>
      
      {/* Practice Strategies */}
      <div className="mt-4">
        <h5 className="text-sm font-medium mb-2">Practice Strategies</h5>
        <ul className="list-disc list-inside text-sm">
          {detailedAiResponse.improvement_plan.practice_strategies.map(
            (strategy: string, index: number) => (
              <li key={index}>{strategy}</li>
            )
          )}
        </ul>
      </div>
    </div>

    {/* Linguistic Background Insights */}
    <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
      <h4 className="font-medium mb-3">Linguistic Background Insights</h4>
      <div className="space-y-3">
        <div>
          <h5 className="text-sm font-medium mb-1">L1 Transfer Effects</h5>
          <ul className="list-disc list-inside text-sm">
            {detailedAiResponse.linguistic_background_insights.probable_l1_transfer_effects.map(
              (effect: string, index: number) => (
                <li key={index}>{effect}</li>
              )
            )}
          </ul>
        </div>
        <div>
          <h5 className="text-sm font-medium mb-1">Cultural Speech Patterns</h5>
          <ul className="list-disc list-inside text-sm">
            {detailedAiResponse.linguistic_background_insights.cultural_speech_patterns.map(
              (pattern: string, index: number) => (
                <li key={index}>{pattern}</li>
              )
            )}
          </ul>
        </div>
        {detailedAiResponse.linguistic_background_insights.multilingual_influences.length > 0 && (
          <div>
            <h5 className="text-sm font-medium mb-1">Multilingual Influences</h5>
            <ul className="list-disc list-inside text-sm">
              {detailedAiResponse.linguistic_background_insights.multilingual_influences.map(
                (influence: string, index: number) => (
                  <li key={index}>{influence}</li>
                )
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  </div>
  )
}