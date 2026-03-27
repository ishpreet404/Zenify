import { checkContent } from './contentMonitor';
import { apiFetch } from './api';

// Enhanced RAG-based suicide detection with improved context awareness
export interface SuicideRiskAnalysis {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  riskFactors: string[];
  contextualCues: string[];
  mcpClassification?: boolean;
  recommendedAction: string;
  flagged: boolean;
  reason?: string;
}

interface ConversationContext {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
  }>;
  userId: string;
  conversationId: string;
}

interface BackendRiskAssessment {
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  risk_factors: string[];
  contextual_cues: string[];
  mcp_classification: boolean;
  recommended_action: string;
  flagged: boolean;
}

// Enhanced suicide-related phrases with context patterns
const ENHANCED_SUICIDE_PATTERNS = {
  direct: [
    'i want to kill myself',
    'i am going to kill myself',
    'i plan to end my life',
    'i am going to commit suicide',
    'i have decided to die',
    'i will take my own life',
    'tonight is my last night',
    'i have a plan to',
    'i already have the',
    'i know how i will do it'
  ],
  indirect: [
    'i can\'t go on anymore',
    'there\'s no point in living',
    'everyone would be better without me',
    'i feel like giving up',
    'life is too hard',
    'i don\'t see a way out',
    'i feel trapped',
    'nothing will ever get better',
    'i am a burden to everyone',
    'i just want the pain to stop'
  ],
  methods: [
    'pills', 'rope', 'bridge', 'gun', 'knife', 'overdose',
    'hanging', 'jumping', 'drowning', 'cutting', 'poison'
  ],
  temporal: [
    'tonight', 'today', 'tomorrow', 'this weekend', 'soon',
    'when i get home', 'after this', 'in the morning'
  ],
  emotional_distress: [
    'hopeless', 'worthless', 'empty', 'numb', 'broken',
    'alone', 'abandoned', 'rejected', 'failure', 'useless'
  ]
};

// Context-aware risk assessment patterns
const CONTEXTUAL_RISK_INDICATORS = {
  isolation: ['no one cares', 'all alone', 'nobody understands', 'no friends'],
  plan_formation: ['i have thought about', 'i have been planning', 'i know exactly how'],
  means_access: ['i have access to', 'i can get', 'i already have'],
  timeline: ['very soon', 'tonight', 'today', 'this week'],
  finality: ['final decision', 'made up my mind', 'there\'s no going back', 'this is it']
};

class EnhancedSuicideDetector {
  private knowledgeBase: string[] = [];

  constructor() {
    this.initializeKnowledgeBase();
  }

  private initializeKnowledgeBase() {
    // Mental health knowledge base for RAG
    this.knowledgeBase = [
      "Suicidal ideation often includes expressions of hopelessness, worthlessness, and desire to escape pain.",
      "Warning signs include talking about death, giving away possessions, social withdrawal, and mood changes.",
      "Risk factors include depression, anxiety, substance abuse, trauma, and social isolation.",
      "Immediate intervention is required when someone expresses a specific plan, means, and timeline.",
      "Crisis resources include National Suicide Prevention Lifeline: 988, Crisis Text Line: Text HOME to 741741.",
      "Professional help should be sought immediately for any suicidal thoughts or behaviors.",
      "Safety planning involves removing means, creating support networks, and identifying coping strategies.",
      "Recovery is possible with appropriate mental health treatment and support systems."
    ];
  }

  private calculatePatternScore(text: string): { score: number; matchedPatterns: string[] } {
    const lowerText = text.toLowerCase();
    let score = 0;
    const matchedPatterns: string[] = [];

    // Direct suicide mentions (highest weight)
    for (const pattern of ENHANCED_SUICIDE_PATTERNS.direct) {
      if (lowerText.includes(pattern)) {
        score += 10;
        matchedPatterns.push(`Direct threat: "${pattern}"`);
      }
    }

    // Indirect expressions (medium-high weight)
    for (const pattern of ENHANCED_SUICIDE_PATTERNS.indirect) {
      if (lowerText.includes(pattern)) {
        score += 6;
        matchedPatterns.push(`Indirect indicator: "${pattern}"`);
      }
    }

    // Method mentions (high weight)
    for (const method of ENHANCED_SUICIDE_PATTERNS.methods) {
      if (lowerText.includes(method)) {
        score += 8;
        matchedPatterns.push(`Method reference: "${method}"`);
      }
    }

    // Temporal indicators (high weight)
    for (const temporal of ENHANCED_SUICIDE_PATTERNS.temporal) {
      if (lowerText.includes(temporal)) {
        score += 7;
        matchedPatterns.push(`Temporal indicator: "${temporal}"`);
      }
    }

    // Emotional distress (medium weight)
    for (const emotion of ENHANCED_SUICIDE_PATTERNS.emotional_distress) {
      if (lowerText.includes(emotion)) {
        score += 3;
        matchedPatterns.push(`Emotional distress: "${emotion}"`);
      }
    }

    return { score, matchedPatterns };
  }

  private analyzeContextualRisk(text: string, context?: ConversationContext): { score: number; contextualCues: string[] } {
    const lowerText = text.toLowerCase();
    let score = 0;
    const contextualCues: string[] = [];

    // Check for contextual risk indicators
    Object.entries(CONTEXTUAL_RISK_INDICATORS).forEach(([category, indicators]) => {
      indicators.forEach(indicator => {
        if (lowerText.includes(indicator)) {
          const weight = category === 'plan_formation' || category === 'means_access' ? 5 : 3;
          score += weight;
          contextualCues.push(`${category}: "${indicator}"`);
        }
      });
    });

    // Analyze conversation history for escalating patterns
    if (context) {
      const recentMessages = context.messages.slice(-5); // Last 5 messages
      const negativePatterns = recentMessages.filter(msg => 
        msg.role === 'user' && this.calculatePatternScore(msg.content).score > 0
      );

      if (negativePatterns.length >= 2) {
        score += 4;
        contextualCues.push('Escalating pattern detected in conversation history');
      }
    }

    return { score, contextualCues };
  }

  private async callBackendRiskAssessment(
    text: string,
    context?: ConversationContext
  ): Promise<BackendRiskAssessment | null> {
    try {
      const response = await apiFetch('/analyze_suicide_risk', {
        method: 'POST',
        auth: true,
        body: JSON.stringify({ 
          text,
          conversation_id: context?.conversationId || 'current',
          user_id: context?.userId || 'current-user',
          context_messages: context?.messages || []
        }),
      });

      if (response.ok) {
        return (await response.json()) as BackendRiskAssessment;
      }
    } catch {
      console.warn('Enhanced RAG API unavailable, using fallback detection');
    }
    return null;
  }

  private determineRiskLevel(
    score: number,
    mcpPositive: boolean,
    backendRiskLevel?: 'low' | 'medium' | 'high' | 'critical'
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (backendRiskLevel === 'critical') return 'critical';
    if (backendRiskLevel === 'high' && score >= 8) return 'high';
    if (score >= 15 || mcpPositive) return 'critical';
    if (score >= 10) return 'high';
    if (score >= 5) return 'medium';
    if (backendRiskLevel === 'high') return 'medium';
    if (backendRiskLevel === 'medium') return 'medium';
    return 'low';
  }

  private getRecommendedAction(riskLevel: string, confidence: number): string {
    switch (riskLevel) {
      case 'critical':
        return `Critical risk detected (confidence ${Math.round(confidence * 100)}%). Stay with the person, remove immediate means if possible, and contact emergency support now (988/911 in US).`;
      case 'high':
        return `High risk detected (confidence ${Math.round(confidence * 100)}%). Encourage immediate crisis support and complete a brief safety plan with trusted contacts.`;
      case 'medium':
        return `Medium risk detected (confidence ${Math.round(confidence * 100)}%). Continue supportive dialogue, assess escalation, and suggest professional follow-up within 24-48 hours.`;
      case 'low':
        return `Low risk detected (confidence ${Math.round(confidence * 100)}%). Continue supportive conversation and monitor for changes.`;
      default:
        return 'Continue monitoring and provide supportive resources.';
    }
  }

  public async analyzeSuicideRisk(
    text: string, 
    context?: ConversationContext
  ): Promise<SuicideRiskAnalysis> {
    // Use existing content monitor as baseline
    const basicCheck = checkContent(text);
    
    // Enhanced pattern analysis
    const patternAnalysis = this.calculatePatternScore(text);
    const contextualAnalysis = this.analyzeContextualRisk(text, context);
    
    // Backend classifier + context-aware risk assessment
    const backendAssessment = await this.callBackendRiskAssessment(text, context);
    const mcpClassification = backendAssessment?.mcp_classification || false;
    
    // Calculate total risk score
    const totalScore = patternAnalysis.score + contextualAnalysis.score;
    const riskLevel = this.determineRiskLevel(totalScore, mcpClassification, backendAssessment?.risk_level);
    
    // Calculate confidence based on multiple factors
    const localConfidence = Math.min(
      (totalScore / 20) * 0.7 + 
      (mcpClassification ? 0.3 : 0) + 
      (basicCheck.flagged ? 0.2 : 0), 
      1.0
    );
    const confidence = backendAssessment
      ? Math.min((localConfidence * 0.45) + (backendAssessment.confidence * 0.55), 1.0)
      : localConfidence;

    const combinedRiskFactors = Array.from(
      new Set([...(backendAssessment?.risk_factors || []), ...patternAnalysis.matchedPatterns])
    );
    const combinedContextualCues = Array.from(
      new Set([...(backendAssessment?.contextual_cues || []), ...contextualAnalysis.contextualCues])
    );
    const recommendedAction =
      backendAssessment?.recommended_action || this.getRecommendedAction(riskLevel, confidence);

    const analysis: SuicideRiskAnalysis = {
      riskLevel,
      confidence,
      riskFactors: combinedRiskFactors,
      contextualCues: combinedContextualCues,
      mcpClassification,
      recommendedAction,
      flagged: (backendAssessment?.flagged ?? false) || riskLevel !== 'low' || basicCheck.flagged,
      reason: basicCheck.reason || 'Enhanced suicide risk signals detected'
    };

    // Log high-risk cases for admin review
    if (riskLevel === 'high' || riskLevel === 'critical') {
      this.logHighRiskCase(text, analysis, context);
    }

    return analysis;
  }

  private async logHighRiskCase(
    text: string, 
    analysis: SuicideRiskAnalysis, 
    context?: ConversationContext
  ) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      userId: context?.userId || 'unknown',
      conversationId: context?.conversationId || 'unknown',
      messageContent: text,
      riskAnalysis: analysis,
      requiresImmediateAttention: analysis.riskLevel === 'critical'
    };

    // Store in admin flagged content (integrate with existing storage system)
    try {
      // This would integrate with your existing storage system
      console.error('HIGH RISK SUICIDE CASE DETECTED:', logEntry);
      
      // In a real implementation, you would:
      // 1. Store in database for admin review
      // 2. Send immediate alerts to mental health professionals
      // 3. Trigger crisis intervention protocols
      // 4. Log for compliance and follow-up
      
    } catch (_error) {
      console.error('Failed to log high-risk case:', _error);
    }
  }
}

// Singleton instance
export const suicideDetector = new EnhancedSuicideDetector();

// Enhanced content monitoring function that integrates with RAG
export const enhancedCheckContent = async (
  text: string, 
  context?: ConversationContext
): Promise<SuicideRiskAnalysis> => {
  return await suicideDetector.analyzeSuicideRisk(text, context);
};

export default {
  suicideDetector,
  enhancedCheckContent,
  ENHANCED_SUICIDE_PATTERNS,
  CONTEXTUAL_RISK_INDICATORS
};
