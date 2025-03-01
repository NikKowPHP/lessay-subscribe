import { AIResponse } from "@/models/AiResponse.model";
import PhonemePlayer from "./PhonemePlayer";

export const BasicAnalysis = ({aiResponse}: {aiResponse: AIResponse}) => {
  return !aiResponse ? null : (
    <div className="w-full mt-8 space-y-6">
    {/* Language & Accent Identification */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Language Detection Card */}
      <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
        <div>
          <h3 className="font-semibold text-lg">
            {aiResponse.language_analyzed}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Language Detected
          </p>
        </div>
      </div>

      {/* Accent Identification Card */}
      <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
        <div>
          <h3 className="font-semibold text-lg">
            {aiResponse.accent_identification.specific_accent}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Accent Type: {aiResponse.accent_identification.accent_type}
          </p>
        </div>
        <div className="flex items-center">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
            {aiResponse.accent_identification.accent_strength}
          </span>
        </div>
      </div>
    </div>

    {/* Speaker Background */}
    <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
      <h3 className="font-semibold mb-2">Speaker Background</h3>
      <div className="space-y-2">
        <p className="text-gray-700 dark:text-gray-300">
          <span className="font-medium">Native Language:</span> {aiResponse.speaker_background.probable_native_language}
        </p>
        <p className="text-gray-700 dark:text-gray-300">
          <span className="font-medium">Probable Region:</span> {aiResponse.speaker_background.probable_region}
        </p>
        <div className="mt-3">
          <p className="font-medium">Supporting Evidence:</p>
          <span className="font-medium">Suporting Evidence: </span> {aiResponse.speaker_background.supporting_evidence}
        </div>
      </div>
    </div>

    {/* Phonological Assessment */}
    <div className="space-y-4">
      <h3 className="font-semibold">Pronunciation Analysis</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {aiResponse.language_specific_phonological_assessment.map(
          (assessment: {
            phoneme: string;
            example: string;
            analysis: string;
            IPA_target: string;
            IPA_observed: string;
          }, index: number) => (
            <div
              key={index}
              className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg"
            >
              <div className="flex justify-between mb-2">
                <span className="font-medium">
                  {assessment.phoneme}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  in &quot;{assessment.example}&quot;
                </span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                {assessment.analysis}
              </p>
              <div className="flex justify-between text-sm items-center">
                <div className="flex items-center gap-2">
                  <span>Target: {assessment.IPA_target}</span>
                  <PhonemePlayer 
                    ipa={assessment.IPA_target} 
                    language={aiResponse.analyzed_language_code} 
                    size="sm" 
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span>Observed: {assessment.IPA_observed}</span>
                  <PhonemePlayer 
                    ipa={assessment.IPA_observed} 
                    language={aiResponse.analyzed_language_code} 
                    size="sm" 
                  />
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </div>

    {/* Suprasegmental Features */}
    <div className="space-y-4">
      <h3 className="font-semibold">Rhythm, Intonation & Stress</h3>
      <div className="grid grid-cols-1 gap-4">
        {aiResponse.suprasegmental_features_analysis.map(
          (feature: {
            feature: string;
            observation: string;
            comparison: string;
          }, index: number) => (
            <div
              key={index}
              className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg"
            >
              <div className="flex justify-between mb-2">
                <span className="font-medium">{feature.feature}</span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                {feature.observation}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 italic">
                {feature.comparison}
              </p>
            </div>
          )
        )}
      </div>
    </div>

    {/* Diagnostic Accent Markers */}
    <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
      <h3 className="font-semibold mb-3">Diagnostic Accent Markers</h3>
      <div className="space-y-3">
        {aiResponse.diagnostic_accent_markers.map((marker: {
          feature: string;
          description: string;
          association: string;
        }, index: number) => (
          <div key={index} className="border-b border-gray-200 dark:border-gray-700 pb-3 last:border-0 last:pb-0">
            <p className="font-medium">{marker.feature}</p>
            <p className="text-sm text-gray-700 dark:text-gray-300">{marker.description}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              <span className="italic">Association:</span> {marker.association}
            </p>
          </div>
        ))}
      </div>
    </div>

    {/* Proficiency Assessment */}
    <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
      <h3 className="font-semibold mb-3">Proficiency Assessment</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="text-center p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
            {aiResponse.proficiency_assessment.intelligibility}
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">Intelligibility</p>
        </div>
        <div className="text-center p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <div className="text-xl font-bold text-green-600 dark:text-green-400">
            {aiResponse.proficiency_assessment.fluency}
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">Fluency</p>
        </div>
        <div className="text-center p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
            {aiResponse.proficiency_assessment.CEFR_level}
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">CEFR Level</p>
        </div>
      </div>
    </div>

    {/* Improvement Suggestions */}
    <div className="space-y-4">
      <h3 className="font-semibold">Improvement Suggestions</h3>
      <div className="space-y-4">
        {aiResponse.improvement_suggestions.map((suggestion: {
          focus_area: string;
          importance: "High" | "Medium" | "Low";
          exercises: string[];
        }, index: number) => (
          <div key={index} className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium">{suggestion.focus_area}</h4>
              <span className={`px-2 py-1 rounded-full text-xs font-medium 
                ${suggestion.importance === 'High' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                suggestion.importance === 'Medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'}`}>
                {suggestion.importance} Priority
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1">
              {suggestion.exercises.map((exercise, idx) => (
                <li key={idx} className="text-sm text-gray-700 dark:text-gray-300">{exercise}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  </div>
  )
}