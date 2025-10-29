/**
 * Service de Gestion Multi-LLM avec Rotation Automatique
 * Optimise l'utilisation des crédits en basculant entre OpenAI, Anthropic et Gemini
 */

import { createLogger } from '../lib/logger';

export interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'gemini';
  apiKey: string;
  model: string;
  requestCount: number;
  lastUsed: Date | null;
  enabled: boolean;
}

export interface LLMResponse {
  provider: string;
  model: string;
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export class LLMManager {
  private logger = createLogger('LLMManager');
  private llms: LLMConfig[] = [];
  private currentIndex = 0;

  constructor(
    openaiKey?: string,
    anthropicKey?: string,
    geminiKey?: string
  ) {
    // Configuration OpenAI (GPT-4 Turbo)
    if (openaiKey) {
      this.llms.push({
        provider: 'openai',
        apiKey: openaiKey,
        model: 'gpt-4-turbo',
        requestCount: 0,
        lastUsed: null,
        enabled: true
      });
    }

    // Configuration Anthropic (Claude)
    if (anthropicKey) {
      this.llms.push({
        provider: 'anthropic',
        apiKey: anthropicKey,
        model: 'claude-3-5-sonnet-20241022',
        requestCount: 0,
        lastUsed: null,
        enabled: true
      });
    }

    // Configuration Gemini
    if (geminiKey) {
      this.llms.push({
        provider: 'gemini',
        apiKey: geminiKey,
        model: 'gemini-pro',
        requestCount: 0,
        lastUsed: null,
        enabled: true
      });
    }

    this.logger.info('LLM Manager initialized', {
      providers: this.llms.map(l => l.provider),
      count: this.llms.length
    });
  }

  /**
   * Sélectionne automatiquement le prochain LLM disponible
   */
  private selectNextLLM(): LLMConfig | null {
    const enabledLLMs = this.llms.filter(l => l.enabled);

    if (enabledLLMs.length === 0) {
      this.logger.error('No LLM providers available');
      return null;
    }

    // Rotation round-robin
    this.currentIndex = (this.currentIndex + 1) % enabledLLMs.length;
    return enabledLLMs[this.currentIndex];
  }

  /**
   * Appel générique à un LLM
   */
  async chat(systemPrompt: string, userPrompt: string, jsonMode = true): Promise<LLMResponse> {
    const llm = this.selectNextLLM();

    if (!llm) {
      throw new Error('No LLM provider available');
    }

    this.logger.info('Using LLM', {
      provider: llm.provider,
      model: llm.model,
      requestNumber: llm.requestCount + 1
    });

    try {
      let response: LLMResponse;

      switch (llm.provider) {
        case 'openai':
          response = await this.callOpenAI(llm, systemPrompt, userPrompt, jsonMode);
          break;
        case 'anthropic':
          response = await this.callAnthropic(llm, systemPrompt, userPrompt);
          break;
        case 'gemini':
          response = await this.callGemini(llm, systemPrompt, userPrompt);
          break;
        default:
          throw new Error(`Unsupported provider: ${llm.provider}`);
      }

      // Mise à jour des statistiques
      llm.requestCount++;
      llm.lastUsed = new Date();

      return response;

    } catch (error: any) {
      this.logger.error('LLM call failed', {
        provider: llm.provider,
        error: error.message
      });

      // Désactiver temporairement ce LLM et essayer le suivant
      llm.enabled = false;

      if (this.llms.filter(l => l.enabled).length > 0) {
        this.logger.info('Trying next LLM provider');
        return this.chat(systemPrompt, userPrompt, jsonMode);
      }

      throw error;
    }
  }

  /**
   * Appel à OpenAI GPT-4 Turbo
   */
  private async callOpenAI(
    llm: LLMConfig,
    systemPrompt: string,
    userPrompt: string,
    jsonMode: boolean
  ): Promise<LLMResponse> {
    const body: any = {
      model: llm.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 1000
    };

    if (jsonMode) {
      body.response_format = { type: 'json_object' };
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${llm.apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      provider: 'openai',
      model: llm.model,
      content: data.choices[0].message.content,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens
      }
    };
  }

  /**
   * Appel à Anthropic Claude
   */
  private async callAnthropic(
    llm: LLMConfig,
    systemPrompt: string,
    userPrompt: string
  ): Promise<LLMResponse> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': llm.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: llm.model,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      provider: 'anthropic',
      model: llm.model,
      content: data.content[0].text,
      usage: {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens
      }
    };
  }

  /**
   * Appel à Google Gemini
   */
  private async callGemini(
    llm: LLMConfig,
    systemPrompt: string,
    userPrompt: string
  ): Promise<LLMResponse> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${llm.model}:generateContent?key=${llm.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${systemPrompt}\n\n${userPrompt}`
            }]
          }]
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      provider: 'gemini',
      model: llm.model,
      content: data.candidates[0].content.parts[0].text
    };
  }

  /**
   * Obtenir les statistiques d'utilisation
   */
  getStats() {
    return {
      providers: this.llms.map(llm => ({
        provider: llm.provider,
        model: llm.model,
        requestCount: llm.requestCount,
        lastUsed: llm.lastUsed,
        enabled: llm.enabled
      })),
      totalRequests: this.llms.reduce((sum, llm) => sum + llm.requestCount, 0)
    };
  }
}

export function createLLMManager(
  openaiKey?: string,
  anthropicKey?: string,
  geminiKey?: string
): LLMManager {
  return new LLMManager(openaiKey, anthropicKey, geminiKey);
}
