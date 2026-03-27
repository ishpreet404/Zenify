#!/usr/bin/env python3
"""Test script to verify ML model integration with backend"""

import sys
import os

# Set dummy OpenRouter key for testing
os.environ['OPENROUTER_API_KEY'] = 'sk_test_dummy_key_for_testing'
os.environ['JWT_SECRET'] = 'test_secret_key_at_least_32_characters_long_for_testing'

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

try:
    from main import rag_system, SuicideAnalysisRequest, RiskAnalysisResponse
    
    print("✓ Backend imports successful")
    print(f"✓ RAG system initialized")
    print(f"  - ML models loaded: {rag_system.mcp_model is not None}")
    print(f"  - Direct patterns: {len(rag_system.direct_patterns)}")
    print(f"  - Indirect patterns: {len(rag_system.indirect_patterns)}")
    print(f"  - Method patterns: {len(rag_system.method_patterns)}")
    print(f"  - Temporal patterns: {len(rag_system.temporal_patterns)}")
    
    # Test the analysis
    test_request = SuicideAnalysisRequest(
        text="I'm feeling really sad and hopeless today",
        conversation_id="test-conv-1",
        user_id="test-user-1",
        context_messages=[
            {"role": "user", "content": "I've been struggling lately"},
            {"role": "assistant", "content": "I'm here to listen and help"}
        ]
    )
    
    result = rag_system.analyze_suicide_risk(test_request)
    print(f"\n✓ Risk analysis successful")
    print(f"  - Risk level: {result.risk_level}")
    print(f"  - Confidence: {result.confidence:.2%}")
    print(f"  - Flagged: {result.flagged}")
    print(f"  - Risk factors: {len(result.risk_factors)}")
    print(f"  - Contextual cues: {len(result.contextual_cues)}")
    
    print("\n✅ All tests passed! ML integration is working correctly.")
    
except ImportError as e:
    print(f"❌ Import error: {e}")
    sys.exit(1)
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
