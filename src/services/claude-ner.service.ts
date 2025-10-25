typescript
import Anthropic from '@anthropic-ai/sdk';
import type { DetectedBook } from '../schemas/photo-books.schema';

export class ClaudeNERService {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async parseSpineText(rawText: string): Promise<Partial<DetectedBook>> {
    const prompt = `Parse this book spine text into structured fields:

"${rawText}"

Extract:
- title
- artist_author (author name)
- publisher_label
- year (if visible)
- format (hardcover/paperback/unknown)
- language (ISO 639-1: en, fr, es, etc.)
- category (books, artbook, cinema, music, reference, biography, interviews, unknown)

Return ONLY valid JSON:
{
  "title": "...",
  "artist_author": "...",
  "publisher_label": "...",
  "year": 1984,
  "format": "hardcover",
  "language": "en",
  "category": "books"
}`;

    const response = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 500,
      temperature: 0.1,
      messages: [{ role: 'user', content: prompt }]
    });

    const content = response.content[0];
    if (content.type !== 'text') throw new Error('Unexpected response type');

    // Parse JSON from response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');

    return JSON.parse(jsonMatch[0]);
  }

  async parseBatch(rawTexts: string[]): Promise<Partial<DetectedBook>[]> {
    // Parallel processing with Promise.all
    return await Promise.all(
      rawTexts.map(text => this.parseSpineText(text))
    );
  }
}