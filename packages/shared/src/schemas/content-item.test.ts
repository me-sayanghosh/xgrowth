import { describe, it, expect } from 'vitest';
import { contentItemSchema } from './content-item.js';
import { ContentStatusEnum, ContentFormatEnum } from '../enums/content.js';

describe('contentItemSchema validation', () => {
  it('validates a well-formed content item', () => {
    const valid = {
      id: 'item-123',
      status: ContentStatusEnum.NEEDS_REVIEW,
      format: ContentFormatEnum.SINGLE_POST,
      text: 'Just deployed my new full-stack project using Node.js & TypeScript!',
      topicPillar: 'Software Engineering',
      sourceUrls: ['https://github.com/project'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const parsed = contentItemSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it('fails when status is invalid', () => {
    const invalid = {
      id: 'item-123',
      status: 'non_existent_status',
      format: ContentFormatEnum.SINGLE_POST,
      text: 'Sample post',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const parsed = contentItemSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it('fails when text exceeds 10,000 characters', () => {
    const tooLong = {
      id: 'item-123',
      status: ContentStatusEnum.DRAFT,
      format: ContentFormatEnum.SINGLE_POST,
      text: 'a'.repeat(10001),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const parsed = contentItemSchema.safeParse(tooLong);
    expect(parsed.success).toBe(false);
  });

  it('fails when sourceUrls contains malformed URL', () => {
    const badUrl = {
      id: 'item-123',
      status: ContentStatusEnum.IDEA,
      format: ContentFormatEnum.SINGLE_POST,
      text: 'Idea note',
      sourceUrls: ['not-a-valid-url'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const parsed = contentItemSchema.safeParse(badUrl);
    expect(parsed.success).toBe(false);
  });
});
